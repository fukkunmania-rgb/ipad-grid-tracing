"""Browser regression tests against the built React app; no mocked React/Canvas.
Run after npm run build. BROWSERS=chromium or BROWSERS=chromium,webkit.
Pointer-event injection tests check routing, not physical Apple Pencil behavior.
"""
from __future__ import annotations

import base64
import json
import os
from pathlib import Path
import struct
import subprocess
import time
import traceback
import urllib.request
import zlib

from playwright.sync_api import sync_playwright, expect
from browser_diagnostics import install_diagnostics, collect_diagnostics
from brush_browser import brush_width_test

RESULTS = Path('test-results')
RESULTS.mkdir(exist_ok=True)
BASE = 'http://127.0.0.1:4173/ipad-grid-tracing/'


def fixture_png():
    def chunk(name, data):
        return struct.pack('>I', len(data)) + name + data + struct.pack('>I', zlib.crc32(name + data) & 0xffffffff)
    width, height = 64, 80
    rows = b''.join(b'\x00' + bytes([245, 120, 100, 255]) * width for _ in range(height))
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(rows)) + chunk(b'IEND', b'')


def settle(page):
    page.evaluate('() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))')


def ready(page):
    page.goto(BASE)
    page.locator('.drawing-canvas').wait_for()
    page.wait_for_function("document.querySelector('.drawing-canvas').getBoundingClientRect().width > 50")
    settle(page)


def canvas(page):
    return page.locator('.drawing-canvas')


def xy(page, x, y, reference=False):
    box = page.locator('.reference-paper' if reference else '.drawing-canvas').bounding_box()
    assert box is not None
    return box['x'] + x * box['width'] / 640, box['y'] + y * box['height'] / 800


def draw(page, x1, y1, x2, y2):
    settle(page)
    page.mouse.move(*xy(page, x1, y1))
    page.mouse.down()
    page.mouse.move(*xy(page, x2, y2), steps=8)
    page.mouse.up()
    settle(page)


def alpha(page, x, y):
    return canvas(page).evaluate('''(canvas, point) => {
      const x = Math.round(point[0] * canvas.width / 640), y = Math.round(point[1] * canvas.height / 800);
      const bytes = canvas.getContext('2d').getImageData(Math.max(0,x-1), Math.max(0,y-1),3,3).data;
      let alpha = 0; for(let i=3;i<bytes.length;i+=4) alpha=Math.max(alpha,bytes[i]); return alpha;
    }''', [x, y])


def reference(page):
    page.get_by_label('参考画像ファイル').set_input_files({'name': 'reference.png', 'mimeType': 'image/png', 'buffer': fixture_png()})
    page.wait_for_function("document.querySelector('.reference-paper img')?.naturalWidth > 0")
    settle(page)


def settings(page):
    button = page.get_by_role('button', name='設定', exact=True)
    if button.get_attribute('aria-expanded') != 'true':
        button.click()
        settle(page)


def save_finished(page):
    expect(page.get_by_test_id('save-status')).to_have_text('この端末に保存済み', timeout=15000)


def stored(page):
    return page.evaluate('''() => new Promise((resolve,reject) => {
      const request=indexedDB.open('grid-tracing',1);
      request.onsuccess=()=>{ const db=request.result; const tx=db.transaction('sessions','readonly');
        const get=tx.objectStore('sessions').get('latest');
        get.onsuccess=()=>{const s=get.result; resolve(s ? {...s,reference:s.reference ? {...s.reference,bytes:undefined,blob:{size:s.reference.blob?.size ?? s.reference.bytes?.byteLength}} : null} : null);};
        tx.oncomplete=()=>db.close(); get.onerror=()=>reject(get.error); };
      request.onerror=()=>reject(request.error);
    })''')


def history_test(page, _):
    for y in [160, 320, 480]: draw(page, 100, y, 350, y)
    for y in [480, 320, 160]:
        assert alpha(page, 200, y) > 0
        page.get_by_role('button', name='元に戻す', exact=True).click()
        assert alpha(page, 200, y) == 0
    for y in [160, 320, 480]:
        page.get_by_role('button', name='やり直す', exact=True).click()
        assert alpha(page, 200, y) > 0
    settings(page)
    page.get_by_role('button', name='描画を消去', exact=True).click()
    assert alpha(page, 200, 160) == 0
    draw(page, 100, 160, 350, 160)
    page.get_by_role('button', name='描画を消去', exact=True).click()
    assert alpha(page, 200, 160) == 0
    page.get_by_role('button', name='元に戻す', exact=True).click()
    assert alpha(page, 200, 160) > 0


def resize_test(page, browser_name):
    reference(page)
    draw(page, 120, 400, 450, 400)
    for width, height in [(1194,834), (834,1194), (600,900), (1194,700)]:
        page.set_viewport_size({'width': width, 'height': height})
        settle(page)
        assert alpha(page, 300, 400) > 0, (width, height)
        measurements = page.evaluate('''() => [...document.querySelectorAll('.paper')].map(paper => {
          const p=paper.getBoundingClientRect(), v=paper.parentElement.getBoundingClientRect(), g=paper.querySelector('svg').getBoundingClientRect();
          return {w:p.width,h:p.height,gw:g.width,gh:g.height,fits:p.left>=v.left-.6&&p.right<=v.right+.6&&p.top>=v.top-.6&&p.bottom<=v.bottom+.6};
        })''')
        a,b=measurements
        assert abs(a['w']-b['w']) < .1 and abs(a['h']-b['h']) < .1, measurements
        for m in measurements:
            assert m['fits'] and abs(m['gw']-m['w']) < .1 and abs(m['gh']-m['h']) < .1, measurements
        page.screenshot(path=str(RESULTS / f'{browser_name}-{width}x{height}.png'))
    settings(page)
    page.get_by_label('グリッドの分割').select_option('2')
    page.get_by_label('グリッドの線幅').select_option('1.5')
    expect(page.locator('.drawing-pane [data-subgrid="true"]')).to_have_count(18)
    assert float(page.locator('.drawing-pane [data-subgrid="true"]').first.get_attribute('stroke-width')) < 1.5
    assert alpha(page, 300, 400) > 0


def foreign_pointer_test(page, _):
    page.mouse.move(*xy(page, 100, 240)); page.mouse.down()
    page.mouse.move(*xy(page, 180, 240))
    for event, kind in [('pointerup','touch'),('pointercancel','touch'),('lostpointercapture','touch'),('pointerup','pen')]:
        canvas(page).dispatch_event(event, {'pointerId':999, 'pointerType':kind, 'bubbles':True})
    page.mouse.move(*xy(page, 450, 240)); page.mouse.up(); settle(page)
    assert alpha(page, 350, 240) > 0
    save_finished(page)
    assert len(stored(page)['strokes']) == 1


def final_endpoint_test(page, _):
    canvas(page).evaluate("c => c.addEventListener('pointerdown',e=>window.testPointerId=e.pointerId)")
    page.mouse.move(*xy(page, 100, 250)); page.mouse.down()
    page.mouse.move(*xy(page, 160, 250))
    x,y=xy(page, 400, 250)
    pointer_id=page.evaluate('window.testPointerId')
    canvas(page).dispatch_event('pointerup', {'pointerId':pointer_id, 'pointerType':'mouse', 'clientX':x,'clientY':y, 'bubbles':True})
    page.mouse.up(); settle(page)
    assert alpha(page, 320, 250) > 0
    save_finished(page)
    assert len(stored(page)['strokes']) == 1


def coalesced_test(page, _):
    canvas(page).evaluate("c => c.addEventListener('pointerdown',e=>window.testPointerId=e.pointerId)")
    page.mouse.move(*xy(page,100,200)); page.mouse.down()
    a=xy(page,200,350); b=xy(page,300,200)
    canvas(page).evaluate('''(c, points) => {
      const make=(point, pressure)=>new PointerEvent('pointermove',{pointerId:window.testPointerId,pointerType:'pen',clientX:point[0],clientY:point[1],pressure,bubbles:true});
      const last=make(points[1],.5);
      Object.defineProperty(last,'getCoalescedEvents',{value:()=>[make(points[0],0),make(points[1],.49)]});
      c.dispatchEvent(last);
    }''',[a,b])
    page.mouse.move(*b); page.mouse.up(); settle(page)
    assert alpha(page,200,350)>0
    save_finished(page)
    stroke=stored(page)['strokes'][0]
    assert stroke['size']==4 and all('pressure' not in p for p in stroke['points'])


def persistence_test(page, _):
    reference(page)
    page.mouse.move(*xy(page,250,350,True)); page.mouse.down()
    page.mouse.move(*xy(page,290,370,True)); page.mouse.up(); settle(page)
    page.get_by_role('button',name='白黒',exact=True).click()
    page.get_by_label('ペンの太さ').select_option('8')
    draw(page,100,400,400,400)
    expect(page.get_by_role('button',name='位置固定中',exact=True)).to_have_attribute('aria-pressed','true')
    page.get_by_role('button',name='比較',exact=True).click()
    settings(page)
    page.get_by_label('グリッドの色').select_option('blue')
    page.get_by_label('グリッドの線幅').select_option('2')
    save_finished(page)
    before=stored(page)
    page.reload(); page.locator('.drawing-canvas').wait_for(); settle(page)
    page.wait_for_function("document.querySelector('.reference-paper img')?.naturalWidth > 0")
    assert alpha(page,250,400)>0
    expect(page.get_by_role('button',name='比較',exact=True)).to_have_attribute('aria-pressed','true')
    expect(page.get_by_role('button',name='白黒',exact=True)).to_have_attribute('aria-pressed','true')
    expect(page.get_by_label('ペンの太さ')).to_have_value('8')
    settings(page)
    expect(page.get_by_label('グリッドの線幅')).to_have_value('2')
    save_finished(page)
    after=stored(page)
    assert before['strokes']==after['strokes'] and before['transform']==after['transform']
    assert after['reference']['blob']['size']>0


def download_pixels(page):
    with page.expect_download() as event:
        page.get_by_role('button',name='PNG保存',exact=True).click()
    data=Path(event.value.path()).read_bytes()
    encoded=base64.b64encode(data).decode()
    return page.evaluate('''async data => {
      const image=new Image();image.src='data:image/png;base64,'+data;await image.decode();
      const c=document.createElement('canvas');c.width=image.width;c.height=image.height;
      const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
      const pixel=(x,y)=>Array.from(ctx.getImageData(Math.floor(x*c.width/640),Math.floor(y*c.height/800),1,1).data);
      return {width:c.width,height:c.height,corner:pixel(10,10),erased:pixel(250,200),ink:pixel(150,200),grid:pixel(80,100)};
    }''',encoded)


def export_test(page, _):
    reference(page)
    page.get_by_label('ペンの太さ').select_option('12')
    draw(page,100,200,450,200)
    page.get_by_role('button',name='消しゴム',exact=True).click()
    page.get_by_label('消しゴムの太さ').select_option('40')
    draw(page,250,170,250,230)
    page.get_by_role('button',name='比較',exact=True).click()
    page.get_by_label('参照画像の濃さ').focus(); page.keyboard.press('End')
    pixels=download_pixels(page)
    assert (pixels['width'],pixels['height'])==(576,720)
    assert pixels['corner']==[255,255,255,255] and pixels['erased']==[255,255,255,255] and pixels['grid']==[255,255,255,255],pixels
    assert pixels['ink']==[0,0,0,255],pixels
    settings(page)
    page.get_by_label('保存画像の背景').select_option('transparent')
    pixels=download_pixels(page)
    assert pixels['corner'][3]==0 and pixels['erased'][3]==0 and pixels['ink']==[0,0,0,255],pixels
    assert int(page.locator('.drawing-canvas').evaluate("e=>getComputedStyle(e).zIndex")) > int(page.locator('.drawing-pane .reference-layer').evaluate("e=>getComputedStyle(e).zIndex"))


def focus_test(page, _):
    reference(page)
    page.get_by_role('button',name='比較',exact=True).click()
    slider=page.get_by_label('参照画像の濃さ'); slider.focus(); page.wait_for_timeout(500)
    expect(slider).to_be_focused()
    initial=int(slider.input_value()); page.keyboard.press('ArrowRight')
    expect(slider).to_have_value(str(initial+1))
    settings(page)
    select=page.get_by_label('グリッドの線幅'); select.focus(); page.wait_for_timeout(500)
    expect(select).to_be_focused()


def invalid_image_test(page, _):
    reference(page); draw(page,100,200,450,200); save_finished(page)
    initial=stored(page)['reference']
    page.get_by_label('参考画像ファイル').set_input_files({'name':'broken.png','mimeType':'image/png','buffer':b'not an image'})
    expect(page.locator('.status-bar [role="status"]')).to_contain_text('画像を読み込めない')
    settle(page)  # Error/status text may resize the available paper viewport.
    assert alpha(page,250,200)>0
    save_finished(page)
    assert stored(page)['reference']==initial
    # Re-selecting the same valid file must be supported after input.value was reset.
    reference(page)
    expect(page.get_by_role('button',name='位置を調整',exact=True)).to_have_attribute('aria-pressed','false')


def corrupt_restore_test(page, _):
    save_finished(page)
    # Leave the app first, so its pagehide autosave cannot overwrite the fixture.
    page.goto(BASE + 'favicon.svg')
    page.wait_for_timeout(300)
    page.evaluate('''() => new Promise((resolve,reject)=>{
      const r=indexedDB.open('grid-tracing',1);r.onsuccess=()=>{const db=r.result,tx=db.transaction('sessions','readwrite');
      tx.objectStore('sessions').put({version:999},'latest');tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};
    })''')
    page.goto(BASE)
    expect(page.get_by_role('heading',name='前回の練習を復元できない')).to_be_visible()
    assert stored(page)['version']==999
    page.get_by_role('button',name='復元せずに新しく始める',exact=True).click()
    page.locator('.drawing-canvas').wait_for();save_finished(page)
    assert stored(page)['version']==1


def two_finger_test(page, browser_name):
    if browser_name!='chromium':
        return 'not applicable: native multitouch injection uses Chromium CDP; gesture math is unit-tested'
    reference(page)
    cdp=page.context.new_cdp_session(page)
    def touch(kind, points):
        cdp.send('Input.dispatchTouchEvent', {'type':kind, 'touchPoints':[{'x':x,'y':y,'id':i,'radiusX':1,'radiusY':1,'force':1} for i,x,y in points]})
        settle(page)
    a=xy(page,120,200,True); b=xy(page,180,240,True); c=xy(page,340,240,True)
    touch('touchStart',[(1,*a)])
    touch('touchMove',[(1,*b)])
    touch('touchStart',[(1,*b),(2,*c)])
    touch('touchMove',[(1,*b),(2,*c)])
    touch('touchEnd',[])
    save_finished(page)
    t=stored(page)['transform']
    assert abs(t['scale']-1)<.02 and abs(t['translateX'])<1 and abs(t['translateY'])<1,t
    touch('touchStart',[(1,*b),(2,*c)])
    d=xy(page,140,240,True); e=xy(page,380,240,True)
    touch('touchMove',[(1,*d),(2,*e)])
    touch('touchEnd',[])
    save_finished(page)
    t=stored(page)['transform']
    assert abs(t['scale']-1.5)<.04,t
    # Anchor is (260,240), away from the paper center (320,400).
    anchor_x=320+t['translateX']+t['scale']*(260-320)
    anchor_y=400+t['translateY']+t['scale']*(240-400)
    assert abs(anchor_x-260)<2 and abs(anchor_y-240)<2,t


CASES=[brush_width_test,history_test,resize_test,foreign_pointer_test,final_endpoint_test,coalesced_test,persistence_test,export_test,focus_test,invalid_image_test,corrupt_restore_test,two_finger_test]


def main():
    report=[]
    log=(RESULTS/'server.log').open('w')
    server=subprocess.Popen(['npm','run','preview','--','--host','127.0.0.1','--port','4173','--strictPort'],stdout=log,stderr=subprocess.STDOUT)
    try:
        for _ in range(100):
            try:
                urllib.request.urlopen(BASE,timeout=.3).close();break
            except Exception:
                if server.poll() is not None: raise RuntimeError('Preview server exited; see test-results/server.log')
                time.sleep(.1)
        else: raise RuntimeError('Preview server did not start')
        with sync_playwright() as playwright:
            for name in os.environ.get('BROWSERS','chromium,webkit').split(','):
                options={'headless':True}
                if name=='chromium' and os.environ.get('CHROMIUM_EXECUTABLE'): options['executable_path']=os.environ['CHROMIUM_EXECUTABLE']
                browser=getattr(playwright,name).launch(**options)
                for case in CASES:
                    context=browser.new_context(viewport={'width':1194,'height':834},device_scale_factor=2,has_touch=True,accept_downloads=True)
                    install_diagnostics(context)
                    page=context.new_page();errors=[]
                    page.on('pageerror',lambda error:errors.append(str(error)))
                    page.on('dialog',lambda dialog:dialog.accept())
                    record={'browser':name,'test':case.__name__}
                    try:
                        ready(page)
                        note=case(page,name)
                        assert not errors,errors
                        record.update(status='skip' if note else 'pass',note=note)
                    except Exception:
                        record.update(status='fail',error=traceback.format_exc(),page_errors=errors,diagnostics=collect_diagnostics(page))
                        page.screenshot(path=str(RESULTS/f'{name}-{case.__name__}-failed.png'))
                    finally:
                        report.append(record)
                        print(json.dumps(record,ensure_ascii=False),flush=True)
                        context.close()
                browser.close()
    finally:
        server.terminate()
        server.wait(timeout=10)
        log.close()
        (RESULTS/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
    failed=[r for r in report if r['status']=='fail']
    print(f"Browser tests: {sum(r['status']=='pass' for r in report)} passed; {sum(r['status']=='skip' for r in report)} skipped; {len(failed)} failed",flush=True)
    if failed: raise SystemExit(1)


if __name__=='__main__': main()
