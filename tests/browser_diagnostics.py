"""Failure diagnostics only; leave all events, Canvas and IDB operations unchanged."""
def install_diagnostics(context):
    context.add_init_script('''
      window.__trace = { pointers: [], storage: [] };
      for (const type of ['pointerdown','pointermove','pointerup','pointercancel','lostpointercapture']) {
        document.addEventListener(type, event => {
          if (!(event.target instanceof HTMLCanvasElement)) return;
          const rect=event.target.getBoundingClientRect();
          const coalesced=event.getCoalescedEvents?.().map(e=>({x:e.clientX,y:e.clientY}));
          window.__trace.pointers.push({type,id:event.pointerId,input:event.pointerType,x:event.clientX,y:event.clientY,rect:rect.toJSON(),coalesced});
          if (window.__trace.pointers.length>40) window.__trace.pointers.shift();
        },true);
      }
      const original=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args){
        try {
          const request=original.apply(this,args);
          request.addEventListener('error',()=>window.__trace.storage.push({name:request.error?.name,message:request.error?.message}));
          return request;
        } catch(error) { window.__trace.storage.push({name:error.name,message:error.message}); throw error; }
      };
    ''')


def collect_diagnostics(page):
    try:
        return page.evaluate('''() => {
          const c=document.querySelector('.drawing-canvas');
          if(!c) return {url:location.href,...window.__trace};
          const ctx=c.getContext('2d'),data=ctx.getImageData(0,0,c.width,c.height).data;
          let minX=c.width,minY=c.height,maxX=-1,maxY=-1,count=0;
          for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(data[(y*c.width+x)*4+3]>0){
            count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
          }
          return {url:location.href,...window.__trace,canvas:{width:c.width,height:c.height,rect:c.getBoundingClientRect().toJSON(),matrix:ctx.getTransform().toJSON(),count,bounds:[minX,minY,maxX,maxY]},saveStatus:document.querySelector('[data-testid="save-status"]')?.textContent};
        }''')
    except Exception as error:
        return {'diagnostic_error':str(error)}
