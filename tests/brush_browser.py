"""Check real raster width, not just the value assigned to ctx.lineWidth."""
from playwright.sync_api import expect


def brush_width_test(page, _):
    canvas = page.locator('.drawing-canvas')
    for size, y in [(4, 160), (12, 320), (20, 480)]:
        page.get_by_label('ペンの太さ').select_option(str(size))
        box = canvas.bounding_box()
        assert box is not None
        x1 = box['x'] + 100 * box['width'] / 640
        x2 = box['x'] + 450 * box['width'] / 640
        client_y = box['y'] + y * box['height'] / 800
        page.mouse.move(x1, client_y)
        page.mouse.down()
        page.mouse.move(x2, client_y, steps=8)
        page.mouse.up()
        expect(page.get_by_test_id('save-status')).to_have_text('この端末に保存済み')
        measurements = canvas.evaluate("""(c, args) => {
          const [size,y]=args, ctx=c.getContext('2d');
          const data=ctx.getImageData(0,0,c.width,c.height).data;
          const x=Math.round(250*c.width/640), targetY=Math.round(y*c.height/800);
          let min=c.height,max=-1;
          for(let row=Math.max(0,targetY-50);row<Math.min(c.height,targetY+50);row++) {
            if(data[(row*c.width+x)*4+3]>0){min=Math.min(min,row);max=Math.max(max,row);}
          }
          return {expected:size*c.width/640,actual:max<min?0:max-min+1,min,max,width:c.width,height:c.height};
        }""", [size,y])
        assert abs(measurements['actual'] - measurements['expected']) <= 2, measurements
