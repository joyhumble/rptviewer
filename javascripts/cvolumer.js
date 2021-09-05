//const nifti = require('nifti-reader-js');
//import * as nifti from '/modules/nifti-reader.js';
const AXIAL = 2
const CORONAL = 1
const SAGITTAL = 0
const INTERP_NEAREST = 0
const INTERP_LINEAR = 1
const axisnames = ['x', 'y', 'z']

const FREEMODE=0;
const CONTROLMODE=1;
const DRAWMODE=2;



class volviewer extends Object{
    constructor(Id,mrifile) {
        super();
        this.volumer = new cvolumelist();
        this.canvaser = new vcanvaslist(this.volumer,Id);  
        this.init();
        if (Array.isArray(mrifile)) this.volumer.load_volumes(mrifile);
        else this.volumer.load_volume(mrifile)    
    }

    init(){
        this.canvaser.add(new vcanvas('sagittal', this.canvaser, 0))
        this.canvaser.add(new vcanvas('coronal',this.canvaser,  1))
        this.canvaser.add(new vcanvas('axial',this.canvaser, 2))
    }
}


class vcanvaslist extends Object {
    constructor(volumer = null,Id) {
        super();
        this.elementId=Id;
        this.canvases = [];
        this.volumer = volumer;
        if (this.volumer !== null) this.volumer.set_canvas_manager(this)
        
        this.update_variables=this.update_variables.bind(this);
        this.draw=this.draw.bind(this);
        this.goto=this.goto.bind(this);
        this.message_proc=this.message_proc.bind(this);
        this.set_xhairs=this.set_xhairs.bind(this);
        this.orthviewmode=true;

        this.colormaps = ['gray', 'jet', 'afmhot', 'PiYG','Spectral','RdBu','Dark2','tab20b']
        //For communication
        this.vector = null; //tocommunicate
        this.dims = [0, 0, 0];
        this.hasToReset = false;

        this.init_controls(1);
    }

    add(canvas = null, ax = null) {
        if (canvas == null) return;
        if (ax !== null) canvas.set_axis(ax);
        canvas.set_volume_manager(this.volumer);
        canvas.init()
        this.canvases.push(canvas)
        if (this.canvases.length == 1) this.link_event()
    }

    link_event() {
    }

    draw() {
        for (let c = 0; c < this.canvases.length; c++) {
            this.canvases[c].draw()
            this.canvases[c].update_label()
        }
    }
    init_controls(slideuppos=1) {
        let workspace = document.getElementById(this.elementId);
        var controldiv = document.createElement("div");
        controldiv.style = "display: flex; flex-direction:row;"
        controldiv.id=this.elementId+'-control';
        // Volume bar
        var volbar = document.createElement("select");
        volbar.id = this.elementId+'-volumebar';
        let width = 14;
        volbar.style.cssText = `width:${width}ch;border:1px  solid #ddd;`;
        volbar.onchange = () => {
            let vol = this.volumer.findvol(document.getElementById(this.elementId+'-volumebar').value);
            document.getElementById(this.elementId+'-colorbar').value=vol.cmapname;
            document.getElementById(this.elementId+'-threshold-slider').value = vol.threshold / vol.max;
            document.getElementById(this.elementId+'-threshold-text').value = vol.threshold / vol.max;
            document.getElementById(this.elementId+'-alpha-slider').value=vol.alpha;            
            document.getElementById(this.elementId+'-alpha-text').value=vol.alpha;
            document.getElementById(this.elementId+'-windowlevel-slider').value = vol.windowlevel;
            document.getElementById(this.elementId+'-windowlevel-text').value = vol.windowlevel;
            document.getElementById(this.elementId+'-windowsize-slider').value = vol.windowsize;
            document.getElementById(this.elementId+'-windowsize-text').value = vol.windowsize;
            if(typeof this.update_variables!=='undefined') this.update_variables();
        }
        controldiv.appendChild(volbar);
        for (var j = 0; j < this.volumer.vols.length; j++) {
            var option = document.createElement("option");
            option.value = this.volumer.vols[j].fname;
            option.text = this.volumer.vols[j].fname;
            volbar.appendChild(option);
        }

        //Color bar
        var colbar = document.createElement("select");
        colbar.id = this.elementId+'-colorbar';
        width = 8;
        colbar.style.cssText = `width:${width}ch;border:1px  solid #ddd;`;
        controldiv.appendChild(colbar);
        for (var j = 0; j < this.colormaps.length; j++) {
            var option = document.createElement("option");
            option.value = this.colormaps[j];
            option.text = this.colormaps[j];
            colbar.appendChild(option);
        }
        colbar.onchange = this.update_variables;

        var canvasdiv1 = document.createElement("div");
        canvasdiv1.style = "display: flex; flex-direction:row;"        
        let labs=['R','A','S']; let label1,textfielda;
        for(let i=0;i<3;i++){
            label1 = document.createElement("label");            
            if (i>0) label1.innerHTML = '&nbsp'+labs[i]+':';
            else label1.innerHTML = '&nbsp&nbsp'+labs[i]+':';
            canvasdiv1.appendChild(label1);
            textfielda = document.createElement("input");
            textfielda.type = 'text';
            textfielda.value = '0';
            textfielda.id = this.elementId+'-'+labs[i]+'-text';
            width = 4;
            textfielda.style.cssText = `width:${width}ch;`; //border: none; border-color: transparent;`;

            textfielda.onchange = () => {
                //구현해야 함..
                let x=document.getElementById(this.elementId+'-R-text').value;
                let y=document.getElementById(this.elementId+'-A-text').value;
                let z=document.getElementById(this.elementId+'-S-text').value;
                let pos=[];
                for(let i=0;i<3;i++) pos.push(this.volumer.vols[0].imat[i][0]*x+this.volumer.vols[0].imat[i][1]*y+this.volumer.vols[0].imat[i][2]*z+this.volumer.vols[0].imat[i][3]);
                this.goto(pos[0], pos[1], pos[2])
                this.draw();
            }
            canvasdiv1.appendChild(textfielda);
        }
        controldiv.appendChild(canvasdiv1);

        // orthviews
        let label = document.createElement("LABEL");
        label.id = this.elementId+'-multilink-label'
        label.innerHTML = '&nbsp&nbspOrthview';   
        controldiv.appendChild(label);
        var check = document.createElement("input");
        check.type = "checkbox";
        check.id = this.elementId+'-multilink';
        check.value = 'link'
        check.checked = true;
        check.onchange = ()=>{this.orthviewmode=document.getElementById(this.elementId+'-multilink').checked;};
        width = 3;
        check.style.cssText = `width:${width}ch;border:1px  solid #ddd;`;
        controldiv.appendChild(check);
        //
        // orthviews
        let labelx = document.createElement("LABEL");
        labelx.id = this.elementId+'-xhair-label'
        labelx.innerHTML = '&nbsp&nbspXhair';   
        controldiv.appendChild(labelx);
        var checkx = document.createElement("input");
        checkx.type = "checkbox";
        checkx.id = this.elementId+'-xhair';
        checkx.value = 'link'
        checkx.checked = true;
        checkx.onchange = this.set_xhairs;
        width = 3;
        checkx.style.cssText = `width:${width}ch;border:1px  solid #ddd;`;
        controldiv.appendChild(checkx);


        if(slideuppos==1) {            
            workspace.insertBefore(controldiv, workspace.firstElementChild);
            this.create_control_sliders(workspace);     
        } else if(slideuppos==2) {            
            workspace.insertBefore(controldiv, workspace.firstElementChild);            
        }

        let vdoc=document.getElementById(this.elementId)
        let obj=document.createElement('div');
        obj.style = "display: flex; flex-direction:row;"
        obj.id=this.elementId+'-vis2d';
        obj.style.width='600px';
        obj.style.height='auto';
        vdoc.appendChild(obj);

        if(slideuppos==2) {            
            this.create_control_sliders(workspace);                     
        }
    }
    create_control_sliders(workspace){
        let controldiv=document.createElement('div');
        controldiv.style = "display: flex; flex-direction:row;"
        controldiv.id=this.elementId+'-control2';
        controldiv.style.border='2px solid #aaa'
        controldiv.style.width='580px';
        let options = {slider_width: 5,nametag:'Opa',callback:this.update_variables};
        this.create_slider_group(this.elementId+'-alpha', 0, 1, 0.1, 1, controldiv, options);
        options = {slider_width: 5,nametag:'Thr',callback:this.update_variables};
        this.create_slider_group(this.elementId+'-threshold', 0, 1, 0.01, 0, controldiv, options);
        options = {slider_width: 5,nametag:'WndL',callback:this.update_variables};
        this.create_slider_group(this.elementId+'-windowlevel', 0, 255, 1, 128, controldiv, options);
        options = {slider_width: 5,nametag:'WndS',callback:this.update_variables};
        this.create_slider_group(this.elementId+'-windowsize', 0, 255, 1, 255, controldiv, options);
        workspace.appendChild(controldiv);   
    }
    create_slider_group(name, min, max, step, val0, parent, options) {
        let width;
        let sliderdiv = document.createElement("div");
        sliderdiv.style = "display: flex; flex-direction:row;"
    
        let label = document.createElement("label");
        let nametag=name;
        if(typeof options.nametag!=='undefined') nametag=options.nametag;
        label.innerHTML = '&nbsp&nbsp'+nametag + ' ' + min;
        sliderdiv.appendChild(label);
    
        let slider = document.createElement("input");
        slider.id = name + '-slider';
        slider.type = "range";
        slider.min = min;
        slider.max = max;
        slider.value = val0;
        if (step == null) step = 1;
        if (step >= max) step = (max - min) / step;
        slider.step = step;
        width = options.slider_width;
        slider.style.cssText = `width:${width}ch;border: none; border-color: transparent;`;
        sliderdiv.appendChild(slider);
        let label2 = document.createElement("label");
        label2.innerHTML = max;
        slider.onchange = () => {
            document.getElementById(name + '-text').value = document.getElementById(name + '-slider').value;
            if(typeof options.callback!=='undefined') options.callback();
        }
        sliderdiv.appendChild(label2);
    
        let textfielda = document.createElement("input");
        textfielda.type = 'text';
        textfielda.value = val0;
        textfielda.id = name + '-text';
        width = 3.5;
        textfielda.style.cssText = `width:${width}ch;`; //border: none; border-color: transparent;`;
        textfielda.onchange = () => {
            document.getElementById(name + '-slider').value = document.getElementById(name + '-text').value;        
        }
        sliderdiv.appendChild(textfielda);
        parent.appendChild(sliderdiv);
    }
    update_objects() {
        for (let c = 0; c < this.canvases.length; c++) {
            this.canvases[c].update();
        }
    }

    deleteChild(id) {
        let e;
        if (typeof id === 'string' || id instanceof String) e = document.getElementById(id);
        else e = id;
        var child = e.lastElementChild;
        while (child) {
            e.removeChild(child);
            child = e.lastElementChild;
        }
    }
    
    update_variables() { //global
        let volbar = document.getElementById(this.elementId+'-volumebar');if(volbar==null) return;
        if (volbar.children.length != this.volumer.vols.length) {
            this.deleteChild(volbar)
            for (var j = 0; j < this.volumer.vols.length; j++) {
                var option = document.createElement("option");
                option.value = this.volumer.vols[j].fname;
                option.text = this.volumer.vols[j].fname;
                volbar.appendChild(option);
            }
        }
        let colbar = document.getElementById(this.elementId+'-colorbar');if(colbar==null) return;
        if (colbar.children.length != this.colormaps.length) {
            for (var j = 0; j < this.colormaps.length; j++) {
                var option = document.createElement("option");
                option.value = this.colormaps[j];
                option.text = this.colormaps[j];
                colbar.appendChild(option);
            }
            document.getElementById(this.elementId+'-colorbar').value = this.colormaps[0];
        }
        let vol = this.volumer.findvol(document.getElementById(this.elementId+'-volumebar').value);
        if(vol!==null) {     
            vol.set_cmap(document.getElementById(this.elementId+'-colorbar').value);
            vol.threshold = document.getElementById(this.elementId+'-threshold-slider').value * vol.max;
            vol.alpha = parseFloat(document.getElementById(this.elementId+'-alpha-slider').value);
            vol.windowsize = document.getElementById(this.elementId+'-windowsize-slider').value;
            vol.windowlevel = document.getElementById(this.elementId+'-windowlevel-slider').value;
        }
        this.draw();
    }

    goto(x, y, z) { //global

        let v=this.volumer.vols[0];
        for (let c = 0; c < this.canvases.length; c++) {
            if (this.canvases[c].axis == 0) {
                this.canvases[c].draw(x);
                if(this.canvases[c].xhairmode) this.canvases[c].draw_xhairs(v.dims[1]-y,v.dims[2]-z);
            }
            else if (this.canvases[c].axis == 1) {
                this.canvases[c].draw(y);
                if(this.canvases[c].xhairmode) this.canvases[c].draw_xhairs(v.dims[0]-x,v.dims[2]-z);
            }
            else if (this.canvases[c].axis == 2) {
                this.canvases[c].draw(z);
                if(this.canvases[c].xhairmode) this.canvases[c].draw_xhairs(v.dims[0]-x,v.dims[1]-y);
            }
            this.canvases[c].update_label();
            
        }
        
    }
    set_xhairs() {
        let id=document.getElementById(this.elementId+'-xhair');if(id==null) return;
        let flag=id.checked;
        for (let c = 0; c < this.canvases.length; c++) this.canvases[c].xhairmode=flag;
        this.draw();
    }

    init_canvas() {
        for (let c = 0; c < this.canvases.length; c++) {
            this.canvases[c].init();
        }
    }
    message_proc(obj) {
        return;
        if (typeof obj.cmd !== 'undefined') {
            if (obj.cmd == 'click') {
                var index = obj.param[0] + this.dims[0] * obj.param[1] + this.dims[1] * this.dims[0] * obj.param[2];
                let data = JSON.stringify({index: index})
                let xhr = new XMLHttpRequest();
                xhr.open('POST', '/vector');
                xhr.setRequestHeader('Content-type', 'application/json');
                xhr.send(data);
    
                xhr.addEventListener('load', function(){
                    var result = JSON.parse(xhr.responseText);
                    if(result.result !== "ok") {
                        alert("no vector data was retrieved");
                    }
                    else {
                        this.vector = result.vector;
                        this.hasToReset = true;
                        //let modelfile = document.getElementById("model").value;
                        //window.surfer.currmodel.load_surf_model(modelfile);
                        if(typeof this.surfer!=='undefined') this.surfer.change_intensity(result.vector)
                    }
    
                })
                //{cmd:'click',param:pos,value:val}
            }
        }
    }
}

class vcanvas extends Object {
    constructor(canvasname = null, vcanvaslist=null,ax = AXIAL) {
        super();
        this.axis = ax;
        this.axisname = axisnames[ax];
        this.volumer = null;
        this.canvaser=vcanvaslist;
        this.textpos = null;
        this.label=null;
        this.xhairmode=true;
        this.actionmode=FREEMODE; //general or drawing, to differentiate between control and drawing
        this.actionstate=FREEMODE; // 0:free moving, 1:control, 2:drawing
        this.canvasImageData=null;

        this.width = 256;
        this.height = 256;

        this.draw=this.draw.bind(this);
        this.update_pos2ras=this.update_pos2ras.bind(this);
        this.mouse_move=this.mouse_move.bind(this);
        this.mouse_click=this.mouse_click.bind(this);
        this.draw_xhairs=this.draw_xhairs.bind(this);

        this.update_pos2ras=this.update_pos2ras.bind(this);


        this.canvas = canvasname;
        if (typeof canvasname == 'string')
            this.canvas = document.getElementById(this.canvaser.elementId+'-'+canvasname);

        if (this.canvas === null) {
            this.create_plane(canvasname);
            this.slider.value = 128;
        }
        if (this.canvas !== null) this.context = this.canvas.getContext("2d");
    }
    
    create_plane(canvasname) {
        let workspace = document.getElementById(this.canvaser.elementId+'-vis2d');
        let canvasname1=this.canvaser.elementId+'-'+canvasname;

        let canvasdiv = document.createElement("div");
        canvasdiv.id = canvasname1 + '-plane';
        canvasdiv.style = "display: flex; flex-direction:column;justify-items: start;"
        workspace.appendChild(canvasdiv);
        
        this.canvas = document.createElement("canvas");
        this.canvas.id = canvasname1 + '-canvas';
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        this.canvas.axis = this.axis;
        this.canvas.axisname = this.axisname;
        this.canvas.vcanvas = this;

        canvasdiv.appendChild(this.canvas);

        let slidediv = document.createElement("div");
        this.label = document.createElement("LABEL");
        this.label.id = canvasname1 + '-label'
        this.label.innerHTML = this.axisname + '=' ;
        this.label.style.visibility = 'hidden'        
        slidediv.appendChild(this.label);
        
        this.textpos = document.createElement("input");
        this.textpos.type = 'text';
        this.textpos.value = '0';
        this.textpos.id = canvasname1 + '-text';
        let width = 4;
        this.textpos.style.cssText = `width:${width}ch;`; //border: none; border-color: transparent;`;
        this.textpos.onchange = () => {
            document.getElementById(canvasname1 + '-slider').value = document.getElementById(canvasname1 + '-text').value;      
            this.draw();  
        }       
        this.textpos.style.visibility = 'hidden'        

        slidediv.appendChild(this.textpos);

        this.slider = document.createElement("input");
        this.slider.id = canvasname1 + '-slider'
        this.slider.type = "range";
        this.slider.min = 1;
        this.slider.max = 100;
        this.slider.value = 50;
        this.slider.style.visibility = 'hidden';
 
        this.slider.onchange = () => {
            if (this.volumer.vols.length == 0) return;
            document.getElementById(canvasname1 + '-text').value=document.getElementById(canvasname1 + '-slider').value;      
            this.draw();
        }
        slidediv.appendChild(this.slider);
        canvasdiv.appendChild(slidediv);       
    }

    update_label() {
        if (this.textpos !== null) this.textpos.value =this.slider.value;
    }

    set_axis(ax) {
        this.axis = ax;
    }

    set_volume_manager(vman) {
        this.volumer = vman;
    }

    set_canvas(canvasname, slidername) {
        if (typeof canvasname == 'string')
            this.canvas = document.getElementById(canvasname);
        else this.canvas = canvasname;
        this.slider = document.getElementById(slidername);
        this.context = this.canvas.getContext("2d");
    }

    update() {
        if (this.volumer.vols.length > 0) {
            if(this.axis==0) {
                this.canvas.width=this.volumer.vols[0].dims[1];
                this.canvas.height=this.volumer.vols[0].dims[2];
            } else if(this.axis==1) {
                this.canvas.width=this.volumer.vols[0].dims[0];
                this.canvas.height=this.volumer.vols[0].dims[2];
            } else if(this.axis==2) {
                this.canvas.width=this.volumer.vols[0].dims[0];
                this.canvas.height=this.volumer.vols[0].dims[1];
            }
            this.canvasImageData = this.context.createImageData(this.canvas.width, this.canvas.height);

            this.slider.max = this.volumer.vols[0].dims[this.axis];
            this.slider.value = Math.round(this.volumer.vols[0].dims[this.axis] / 2);
            this.slider.style.visibility = 'visible';
            this.textpos.style.visibility = 'visible';
            this.label.style.visibility = 'visible';
        }
        this.update_label();
    }
    update_pos2ras(pos){
        let ras=[]; let x=pos[0],y=pos[1],z=pos[2];
        for(let i=0;i<3;i++) ras.push(this.volumer.vols[0].mat[i][0]*x+this.volumer.vols[0].mat[i][1]*y+this.volumer.vols[0].mat[i][2]*z+this.volumer.vols[0].mat[i][3]);
        document.getElementById(this.canvaser.elementId+'-R-text').value=ras[0];
        document.getElementById(this.canvaser.elementId+'-A-text').value=ras[1];
        document.getElementById(this.canvaser.elementId+'-S-text').value=ras[2];
    }
    init() {
        this.canvas.addEventListener("click", e => {
            this.mouse_click(e);
        });

        this.canvas.addEventListener('mousemove', e => {
            this.mouse_move(e);
        });
        // Add the event listeners for mousedown, mousemove, and mouseup
        this.canvas.addEventListener('mousedown', e => {
            if (this.volumer.vols.length == 0) return;
            if (this.actionstate==FREEMODE) {
                this.posx = e.offsetX;
                this.posy = e.offsetY;
                this.actionstate=CONTROLMODE;
            }
        });
        window.addEventListener('mouseup', e => {
            if (this.volumer.vols.length == 0) return;
            if (this.actionstate==DRAWMODE ) {
                this.drawLine(e.currentTarget, this.posx, this.posy, e.offsetX, e.offsetY);
                this.posx = 0;
                this.posy = 0;
                this.actionstate=FREEMODE ;
            }
        });
    }
    mouse_click(e){
        if (this.volumer.vols.length == 0) return;
            const canvas = e.currentTarget;
            const cv=canvas.vcanvas;
            const ctx = canvas.getContext('2d');
            let x1=e.offsetX;
            let y1=e.offsetY;
            let pos;
            if (cv.canvaser.orthviewmode) {
                const canvas=e.currentTarget;
                const rect = canvas.getBoundingClientRect(); // abs. size of element
                let scaleX = canvas.width / rect.width;    // relationship bitmap vs. element for X
                let scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y
                let rv = this.volumer.vols[0];
                let z1 = Math.round(cv.slider.value);               
                
                if (cv.axis == 0) {
                    x1=rect.width-x1;
                    y1=rect.height-y1;
                    x1=Math.round(x1*scaleX); //canvas position
                    y1=Math.round(y1*scaleY);
                    pos = [z1, x1, y1];
                } else if (cv.axis == 1) {
                    x1=rect.width-x1;
                    y1=rect.height-y1;
                    x1=Math.round(x1*scaleX); //canvas position
                    y1=Math.round(y1*scaleY);       
                    pos = [x1, z1, y1];
                } else if (cv.axis == 2) {
                    x1=rect.width-x1;
                    y1=rect.height-y1;
                    x1=Math.round(x1*scaleX); //canvas position
                    y1=Math.round(y1*scaleY);    
                    pos = [x1, y1, z1];
                }
                if(this.canvaser.orthviewmode) {
                    this.canvaser.goto(pos[0], pos[1], pos[2])
                    this.update_pos2ras(pos);
                } else {
                    this.draw();
                    if(this.xhairmode) this.draw_xhairs(e.offsetX,e.offsetY);
                }

                let val1 = rv.samplef(pos[0]-1, rv.dims[1]-pos[1]-1, pos[2]-1);
                let str = "(" + pos[0] + ", " + pos[1] + ", " + pos[2] + ")";//+ " I=" + vol.samplef(xi,yi,zi);
                str = str + ' ' + val1;
                if (this.volumer.vols.length > 1) {
                    let val2 = this.volumer.vols[1].samplef(pos[0]-1, rv.dims[1]-pos[1]-1, pos[2]-1);
                    str = str + ',' + val2;
                }
                ctx.font = '10px arial';
                ctx.fillStyle = 'white';
                ctx.fillText(str, 5, 12);       

                let val = null;
                if (this.volumer.vols.length > 1) {
                    val = this.volumer.vols[1].samplef(pos[0], rv.dims[1]-pos[1], pos[2]);
                }
                let obj = {cmd: 'click', param: pos, value: val}
                this.canvaser.message_proc(obj)
            }
    }
    mouse_move(e) {
        if (this.volumer.vols.length == 0) return;
            let x1, y1, pos;
            const cv = e.currentTarget.vcanvas;
            const canvas=e.currentTarget;
            const ctx = canvas.getContext('2d');
            x1 = e.offsetX;
            y1 = e.offsetY;
            if (this.isDrawing & this.actionstate) {
                this.drawLine(e.currentTarget, x, y, e.offsetX, e.offsetY);
                this.posx = x1;
                this.posy = y1;
            } else {          
                const rect = canvas.getBoundingClientRect(); // abs. size of element
                let scaleX = canvas.width / rect.width;    // relationship bitmap vs. element for X
                let scaleY = canvas.height / rect.height;  // relationship bitmap vs. element for Y      
                let rv = this.volumer.vols[0];
                //var x1 = e.clientX - rect.left; 
                //var y1 = e.clientY - rect.top;  
                let z1 = Math.round(cv.slider.value);               
                
                if (cv.axis == 0) {
                    x1=rect.width-x1;
                    y1=rect.height-y1;
                    x1=Math.round(x1*scaleX); //canvas position
                    y1=Math.round(y1*scaleY);
                    pos = [z1, x1, y1];
                } else if (cv.axis == 1) {
                    x1=rect.width-x1;
                    y1=rect.height-y1;
                    x1=Math.round(x1*scaleX); //canvas position
                    y1=Math.round(y1*scaleY);       
                    pos = [x1, z1, y1];
                } else if (cv.axis == 2) {
                    x1=rect.width-x1;
                    y1=rect.height-y1;
                    x1=Math.round(x1*scaleX); //canvas position
                    y1=Math.round(y1*scaleY);    
                    pos = [x1, y1, z1];
                }

                let val1 = rv.samplef(pos[0]-1, rv.dims[1]-pos[1]-1, pos[2]-1);
                let str = "(" + pos[0] + ", " + pos[1] + ", " + pos[2] + ")";//+ " I=" + vol.samplef(xi,yi,zi);
                str = str + ' ' + val1;
                if (this.volumer.vols.length > 1) {
                    let val2 = this.volumer.vols[1].samplef(pos[0]-1, rv.dims[1]-pos[1]-1, pos[2]-1);
                    str = str + ',' + val2;
                }

                /* paint text position
                ctx.save();
                let w = 120;
                let h = 15; //w=canvas.width;h=canvas.height;                
                ctx.clearRect(0, 0, w, h);
                ctx.fillRect(0, 0, w, h);
                */
                ctx.putImageData(this.canvasImageData, 0, 0);    
                ctx.font = '10px arial';
                ctx.fillStyle = 'white';
                ctx.fillText(str, 5, 12);        
                //ctx.restore();
                if(this.xhairmode) this.draw_xhairs(e.offsetX,e.offsetY);
            }
    }

    getMousePos(evt) {
        var rect = this.canvas.getBoundingClientRect(), // abs. size of element
        scaleX = this.canvas.width / rect.width,    // relationship bitmap vs. element for X
        scaleY = this.canvas.height / rect.height;  // relationship bitmap vs. element for Y
        return {
            x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
            y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
        }
    }
    draw_pos(evt) {
        var pos = this.getMousePos(evt);
        this.context.fillStyle = "#000000";
        this.context.fillRect(pos.x, pos.y, 4, 4);
    }

    draw_xhairs(x,y){
        this.drawLine(this.context,x,0,x,this.canvas.height);
        this.drawLine(this.context,0,y,this.canvas.width,y);
    }

    draw(sl = null, axis = this.axis) {
        if (this.volumer.vols.length == 0) return;
        if (sl == null && this.slider != null) sl = parseInt(this.slider.value);
        else this.slider.value = parseInt(sl);
        let vol = this.volumer.vols[0];
        if (axis == AXIAL) {
            this.canvas.width = vol.dims[0];
            this.canvas.height = vol.dims[1];
        } else if (axis == CORONAL) {
            this.canvas.width = vol.dims[0];
            this.canvas.height = vol.dims[2];
        } else if (axis == SAGITTAL) {
            this.canvas.width = vol.dims[1];
            this.canvas.height = vol.dims[2];            
        }
        if(this.canvasImageData==null) this.canvasImageData = this.context.createImageData(this.canvas.width, this.canvas.height);
        this.volumer.slice2canvas(sl-1, axis, this.canvasImageData.data);
        this.context.putImageData(this.canvasImageData, 0, 0);        
    }
    drawLine (context, x1, y1, x2, y2) {
        //let context = canvas.getContext("2d");
        context.beginPath();
        context.strokeStyle = 'green';
        context.lineWidth = 1;
        context.moveTo(x1, y1);
        context.lineTo(x2, y2);
        context.stroke();
        context.closePath();
    }
}

class cvolumelist extends Object {
    constructor() {
        super();
        this.vols = [];
        this.data = [];
        this.dims = [];
        this.voxs = [];
        this.canvaser = null;
        this.threshold = 0;
        this.curvol=null;

        this.load_file_blob=this.load_file_blob.bind(this);
        this.load_volume=this.load_volume.bind(this);
        this.load_volume2=this.load_volume2.bind(this);
        this.add=this.add.bind(this);
    }

    set_canvas_manager(cman) {
        this.canvaser = cman;
    }

    slice(sl, axis) {
        for (let i = 0; i < this.vols.length; i++) {
            this.data.push(this.vols[i].slice(sl, axis));
        }
        return this.data;
    }

    add(vol) {
        this.vols.push(vol);
        if (this.vols.length == 1) {
            for (let i = 0; i < 3; i++) {
                this.dims[i] = vol.dims[i];
                this.voxs[i] = vol.voxs[i];
            }
        } else {
            this.alpahs = [0.5, 0.5]
        }
        this.dims = this.dims;
        if (this.vols.length == 1) {
            this.canvaser.update_objects();
        }        
        this.canvaser.update_variables()    
    }

    findvol(name) {
        for (let i = 0; i < this.vols.length; i++) {
            if (this.vols[i].fname == name) return this.vols[i];
        }
        return null;
    }

    slice2canvas(sl, axis, cdata) { 
        let dims = [];
        if (sl >= this.dims[axis]) sl = this.dims[axis] - 1;
        if (sl <0) sl = 0;
        if (axis == 0) dims = [this.dims[1], this.dims[2]];
        else if (axis == 1) dims = [this.dims[0], this.dims[2]];
        else if (axis == 2) dims = [this.dims[0], this.dims[1]];

        let ct = 0;
        let value = [];let alpha1, alpha;
        if (this.vols.length == 1) {
            let data1 = this.vols[0].slice(sl, axis);
            for (let j = 0; j < dims[1]; j++) {
                for (let i = 0; i < dims[0]; i++) {
                    if (data1[ct] <= this.vols[0].threshold) {
                        value = [0, 0, 0, 0xFF];
                    }
                    else {
                        value = this.vols[0].rgb(data1[ct]);
                        alpha1=parseFloat(this.vols[0].alpha);          
                        value[0] = value[0] * alpha1;
                        value[1] = value[1] * alpha1;
                        value[2] = value[2] * alpha1;
                    }

                    cdata[ct * 4] = Math.round(value[0]);
                    cdata[ct * 4 + 1] = Math.round(value[1]);
                    cdata[ct * 4 + 2] = Math.round(value[2]);
                    cdata[ct * 4 + 3] = 0xFF;
                    ct++;
                }
            }
        } else if (this.vols.length == 2) {
            let data1 = this.vols[0].slice(sl, axis);
            let data2 = this.vols[1].slice(sl, axis);
            let value2;
            
            for (let j = 0; j < dims[1]; j++) {
                for (let i = 0; i < dims[0]; i++) {
                    if (data1[ct] <= this.vols[0].threshold) {
                        value = [0, 0, 0, 0xFF];
                    }
                    else {
                        value = this.vols[0].rgb(data1[ct]);
                        alpha1=parseFloat(this.vols[0].alpha);          
                        value[0] = value[0] * alpha1;
                        value[1] = value[1] * alpha1;
                        value[2] = value[2] * alpha1;
                    }
                    alpha = parseFloat(this.vols[1].alpha);     
                    if(alpha>0){
                        if (data2[ct] > this.vols[1].threshold) {                                               
                            alpha1 = 1 - alpha;
                            value2 = this.vols[1].rgb(data2[ct]);

                            value[0] = value[0] * alpha1;
                            value[1] = value[1] * alpha1;
                            value[2] = value[2] * alpha1;

                            value[0] += value2[0] * alpha;
                            value[1] += value2[1] * alpha;
                            value[2] += value2[2] * alpha;
                        }
                    }
                    cdata[ct * 4] = Math.round(value[0]);
                    cdata[ct * 4 + 1] = Math.round(value[1]);
                    cdata[ct * 4 + 2] = Math.round(value[2]);
                    cdata[ct * 4 + 3] = 0xFF;
                    ct++;
                }
            }
        } else if (this.vols.length == 3) {
            let data1 = this.vols[0].slice(sl, axis);
            let data2 = this.vols[1].slice(sl, axis);
            let data3 = this.vols[2].slice(sl, axis);
            let value2;
            for (let j = 0; j < dims[1]; j++) {
                for (let i = 0; i < dims[0]; i++) {
                    if (data1[ct] <= this.vols[0].threshold) {
                        value = [0, 0, 0, 0xFF];
                    }
                    else {
                        value = this.vols[0].rgb(data1[ct]);
                        alpha1=parseFloat(this.vols[0].alpha);          
                        value[0] = value[0] * alpha1;
                        value[1] = value[1] * alpha1;
                        value[2] = value[2] * alpha1;
                    }
                    alpha = parseFloat(this.vols[1].alpha);     
                    if(alpha>0){
                        if (data2[ct] > this.vols[1].threshold) {                                               
                            alpha1 = 1 - alpha;
                            value2 = this.vols[1].rgb(data2[ct]);

                            value[0] = value[0] * alpha1;
                            value[1] = value[1] * alpha1;
                            value[2] = value[2] * alpha1;

                            value[0] += value2[0] * alpha;
                            value[1] += value2[1] * alpha;
                            value[2] += value2[2] * alpha;
                        }
                    }
                    alpha = parseFloat(this.vols[2].alpha);
                    if(alpha>0){
                        if (data3[ct] > this.vols[2].threshold) {
                            value2 = this.vols[2].rgb(data3[ct]);
                            alpha1 = 1 - alpha;
                            value[0] = value[0] * alpha1;
                            value[1] = value[1] * alpha1;
                            value[2] = value[2] * alpha1;
                            value[0] += value2[0] * alpha;
                            value[1] += value2[1] * alpha;
                            value[2] += value2[2] * alpha;
                        }
                    }

                    cdata[ct * 4] = Math.round(value[0]);
                    cdata[ct * 4 + 1] = Math.round(value[1]);
                    cdata[ct * 4 + 2] = Math.round(value[2]);
                    cdata[ct * 4 + 3] = 0xFF;
                    ct++;
                }
            }
        }
    }

    load_file_blob(blob, arrayBuffer,filename="bMNI152_mri.nii",cmap='gray',alpha=1) {
        var reader = new FileReader();
        blob = blob.slice(0, blob.size, "");
        reader.onloadend =  (evt) => {
            if (evt.target.readyState === FileReader.DONE) {
                this.curvol = new cvolume(filename, arrayBuffer);
                this.curvol.threshold=0;
                this.curvol.alpha=parseFloat(alpha);
                this.curvol.set_cmap(cmap);
                //external values
                this.add(this.curvol);
                this.canvaser.draw();
                
            }
        };
        reader.readAsArrayBuffer(blob);
    }


    load_volume(mri_file,overlaymode=false) {
        var blob; var arrayBuffer; var alpha=1; var cmap='gray';
        if(overlaymode) { alpha=0.5; cmap='jet';}
        fetch(mri_file)
        .then(response => response.blob())
        .then(b => {
            // do stuff with `ArrayBuffer` representation of file
            blob = b;
            fetch(mri_file)
            .then(response => response.arrayBuffer())
            .then(ab => {
                arrayBuffer = ab;
                this.load_file_blob(blob, arrayBuffer,mri_file,cmap,alpha);
            })
            .catch(err => console.log(err));
        })
    }
    load_volumes(files,overlaymode=true) {
        var blob; var arrayBuffer; var alpha=1; var cmap='gray';
        if(overlaymode) { alpha=0.5; cmap='jet';}
        fetch(files[0])
        .then(response => response.blob())
        .then(b => {
            // do stuff with `ArrayBuffer` representation of file
            blob = b;
            fetch(files[0])
                .then(response => response.arrayBuffer())
                .then(ab => {
                    arrayBuffer = ab;
                    this.load_file_blob(blob, arrayBuffer,files[0],cmap,alpha);
                })
                .catch(err => console.log(err));
        })
        .then(reponse=>{
        fetch(files[1])
        .then(response => response.blob())
        .then(b => {
            // do stuff with `ArrayBuffer` representation of file
            blob = b;
            fetch(files[1])
                .then(response => response.arrayBuffer())
                .then(ab => {
                    arrayBuffer = ab;
                    this.load_file_blob(blob, arrayBuffer,files[1],cmap,alpha);
                })
                .catch(err => console.log(err));
        })
        })
    }

    
    load_volume2(file) {
        function  make_slice(file, start, length) {
            var fileType = (typeof File);
            if (fileType === 'undefined') {
                return function () {
                };
            }
            if (File.prototype.slice) {
                return file.slice(start, start + length);
            }
            if (File.prototype.mozSlice) {
                return file.mozSlice(start, length);
            }
            if (File.prototype.webkitSlice) {
                return file.webkitSlice(start, length);
            }
            return null;
        }
        //filelist
        var blob = make_slice(file[0], 0, file[0].size);
        //blob
        var reader = new FileReader();
        reader.onloadend = (evt) => {
            if (evt.target.readyState === FileReader.DONE) {
                let curvol = new cvolume(files[0],evt.target.result);
                console.log(curvol);
                //external values
                this.add(curvol);
                this.draw();
            }
        };
        console.log(blob);
        reader.readAsArrayBuffer(blob);
    }


}

class cvolume extends Object {
    constructor(fname, data = null) {
        super();
        this.fname = fname;
        this.scl_slope = 1;
        this.scl_inter = 0;
        this.interp_mode = INTERP_NEAREST
        this.dims = [255, 255, 255];
        this.voxs = [1, 1, 1];
        this.vorigin=[];
        this.header = null;
        this.pbuf = null;
        this.interp_mode = INTERP_LINEAR;
        this.min;
        this.max;
        this.mean;
        this.std;

        this.imat=[[-1,0,0,91],[0,1,0,127],[0,0,1,73],[0,0,0,1]];
        this.mat=[[-1,0,0,91],[0,1,0,-127],[0,0,1,-73],[0,0,0,1]];

        // exceptionally display
        this.alpha = 1;
        this.threshold = 0;
        this.cmapname = 'gray'
        this.cmaptable = [];
        this.windowsize=256;
        this.windowlevel=128;

        this.set_cmap()
        if (data == null) {
        } else {
            this.parse_nii_file(data);
        }
    }

    update() {
        this.dims[0] = this.header.dims[1];
        this.dims[1] = this.header.dims[2];
        this.dims[2] = this.header.dims[3];

        let len = this.dims[0] * this.dims[1] * this.dims[2];
        this.min = 1000000000;
        this.max = -10000000;
        this.mean = 0;
        this.std = 0;
        let ct = 0;
        for (let i = 0; i < len; i++) {
            if (isNaN(this.pbuf[i])) continue;
            this.min = this.min > this.pbuf[i] ? this.pbuf[i] : this.min;
            this.max = this.max < this.pbuf[i] ? this.pbuf[i] : this.max;
            this.mean += this.pbuf[i];
            ct++;
            this.std += this.pbuf[i] * this.pbuf[i];
        }
        this.mean = this.mean / ct;
        this.std = Math.sqrt(this.std / ct - this.mean * this.mean);
    }

    parse_nii_file(data) { //parse and read header and data
        // parse nifti
        if (nifti.isCompressed(data)) {
            data = nifti.decompress(data);
        }
        if (nifti.isNIFTI(data)) {
            this.header = nifti.readHeader(data);
            let niftiImage = nifti.readImage(this.header, data);

            if (this.header.datatypeCode === nifti.NIFTI1.TYPE_UINT8) {
                this.pbuf = new Uint8Array(niftiImage);
            } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_INT16) {
                this.pbuf = new Int16Array(niftiImage);
            } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_INT32) {
                this.pbuf = new Int32Array(niftiImage);
            } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT32) {
                this.pbuf = new Float32Array(niftiImage);
            } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_FLOAT64) {
                this.pbuf = new Float64Array(niftiImage);
            } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_INT8) {
                this.pbuf = new Int8Array(niftiImage);
            } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_UINT16) {
                this.pbuf = new Uint16Array(niftiImage);
            } else if (this.header.datatypeCode === nifti.NIFTI1.TYPE_UINT32) {
                this.pbuf = new Uint32Array(niftiImage);
            } else {
                return;
            }
        }
        this.update();
    }

    sample(x, y, z, t = 0, ch = 0) {
        let val;
        let point = [x, y, z];
        let d4 = 0;
        if (this.dims.length > 3) d4 = this.dims[3];
        let offset = this.dims[0] * this.dims[1] * this.dims[2] * (t + ch * d4);

        if (this.interp_mode == INTERP_NEAREST)
            val = this.interp_nearest(point, offset);
        else if (this.interp_mode == INTERP_LINEAR) val = this.interp_trilinear(point, offset);

        return val * this.scl_slope + this.scl_inter;
    }

    samplef(x, y, z) { //fast sampling
        let val;
        let point = [x, y, z];
        val = this.interp_nearest(point, 0);
        return val * this.scl_slope + this.scl_inter;
    }

    interp_trilinear(point, offset) {
        let inInc = [1, this.dims[0], this.dims[0] * this.dims[1]];
        let fx, fy, fz;
        let floorX = Math.floor(point[0]);
        fx = point[0] - floorX;
        if (fx < 0) {
            floorX--;
            fx = point[0] - floorX;
        }
        let floorY = Math.floor(point[1]);
        fy = point[1] - floorY;
        if (fy < 0) {
            floorY--;
            fy = point[1] - floorY;
        }
        let floorZ = Math.floor(point[2]);
        fz = point[2] - floorZ;
        if (fz < 0) {
            floorZ--;
            fz = point[2] - floorZ;
        }

        let inIdX0 = floorX;
        let inIdY0 = floorY;
        let inIdZ0 = floorZ;

        let inIdX1 = inIdX0 + (fx != 0);
        let inIdY1 = inIdY0 + (fy != 0);
        let inIdZ1 = inIdZ0 + (fz != 0);

        if (inIdX0 < 0 || inIdX1 >= this.dims[0] || inIdY0 < 0 || inIdY1 >= this.dims[1] || inIdZ0 < 0 || inIdZ1 >= this.dims[2]) {// out of bounds: clear to background color
            return 0.0;
        } else {// do trilinear leterpolation
            let factX = inIdX0 * inInc[0];
            let factY = inIdY0 * inInc[1];
            let factZ = inIdZ0 * inInc[2];

            let factX1 = inIdX1 * inInc[0];
            let factY1 = inIdY1 * inInc[1];
            let factZ1 = inIdZ1 * inInc[2];

            let i000 = factX + factY + factZ + offset;
            let i001 = factX + factY + factZ1 + offset;
            let i010 = factX + factY1 + factZ + offset;
            let i011 = factX + factY1 + factZ1 + offset;
            let i100 = factX1 + factY + factZ + offset;
            let i101 = factX1 + factY + factZ1 + offset;
            let i110 = factX1 + factY1 + factZ + offset;
            let i111 = factX1 + factY1 + factZ1 + offset;

            let rx = 1.0 - fx;
            let ry = 1.0 - fy;
            let rz = 1.0 - fz;

            let ryrz = ry * rz;
            let ryfz = ry * fz;
            let fyrz = fy * rz;
            let fyfz = fy * fz;

            let val = rx * (ryrz * this.pbuf[i000] + ryfz * this.pbuf[i001] + fyrz * this.pbuf[i010] + fyfz * this.pbuf[i011])
                + fx * (ryrz * this.pbuf[i100] + ryfz * this.pbuf[i101] + fyrz * this.pbuf[i110] + fyfz * this.pbuf[i111]);

            return val;
        }
    }

    interp_nearest(point, offset) {
        let inIdX = Math.round(point[0]);
        let inIdY = Math.round(point[1]);
        let inIdZ = Math.round(point[2]);
        if (inIdX < 0 || inIdX >= this.dims[0] || inIdY < 0 || inIdY >= this.dims[1] || inIdZ < 0 || inIdZ >= this.dims[2]) return 0.0;
        else return this.pbuf[inIdX + inIdY * this.dims[0] + inIdZ * this.dims[0] * this.dims[1] + offset];
    }

    set_cmap(cm = this.cmapname) { //set colormap
        this.cmapname = cm;
        this.cmaptable = [];
        let n = 255;
        for (let i = 0; i <= n; i++) {
            var color = linearInterp(i / n, window[this.cmapname]);
            let r = Math.round(255 * color[0]);
            let g = Math.round(255 * color[1]);
            let b = Math.round(255 * color[2]);
            this.cmaptable.push([r, g, b, 0xFF])
        }
    }

    rgb(val) {
        let val1 = Math.round(255 * (val - this.min) / (this.max - this.min));
        let min=this.windowlevel-this.windowsize/2;
        val1 = Math.round(255 * (val1 - min) / this.windowsize);
        if (val1 >= 255) val1 = 255;
        if (val1 < 0) val1 = 0;
        return this.cmaptable[val1];
    }

    slice(sl, axis, reverse = true, flip = true, t = 0, ch = 0) //nearest neighborhood method..
    {
        let data = [];
        let i, j, k, ct, joff, koff;
        let boff = 0;
        let blocksize = this.dims[0] * this.dims[1] * this.dims[2];
        let imagesize = this.dims[0] * this.dims[1];
        let linesize = this.dims[0];
        sl = Math.round(sl);
        if (sl < 0) sl = 0;
        if (sl >= this.dims[axis]) sl = this.dims[axis] - 1;
        let ntime;
        if (this.dims.length > 3) ntime = this.dims[3];
        else ntime = 0;
        boff = blocksize * (t + ntime * ch);
        if (axis == AXIAL) {
            ct = 0;
            koff = sl * imagesize + boff;
            for (let jj = 0; jj < this.dims[1]; jj++) {
                if (reverse) j = this.dims[1] - jj - 1; else j = jj;
                joff = j * this.dims[0] + koff;
                for (let ii = 0; ii < this.dims[0]; ii++) {
                    if (flip) i = this.dims[0] - ii - 1; else i = ii;
                    data[ct++] = this.pbuf[joff + i] * this.scl_slope + this.scl_inter;
                }
            }
        } else if (axis == CORONAL) {
            ct = 0;
            for (let kk = 0; kk < this.dims[2]; kk++) {
                if (reverse) k = this.dims[2] - kk - 1; else k = kk;
                koff = k * imagesize + sl * linesize + boff;
                for (let ii = 0; ii < this.dims[0]; ii++) {
                    if (flip) i = this.dims[0] - ii - 1; else i = ii;
                    data[ct++] = this.pbuf[koff + i] * this.scl_slope + this.scl_inter;
                }
            }
        } else if (axis == SAGITTAL) {
            ct = 0;
            for (let kk = 0; kk < this.dims[2]; kk++) {
                if (reverse) k = this.dims[2] - kk - 1; else k = kk;
                koff = k * imagesize + boff;
                for (let jj = 0; jj < this.dims[1]; jj++) {
                    if (flip) j = this.dims[1] - jj - 1; else j = jj;
                    joff = j * this.dims[0] + koff;
                    data[ct++] = this.pbuf[joff + sl] * this.scl_slope + this.scl_inter;
                }
            }
        }
        return data;
    }

    sliceA(A, pdims, t, ch) {
        let ct = 0;
        let pin = [];
        let o = [];
        let data = [];
        for (let i = 0; i < pdims[1]; i++) {
            for (let j = 0; j < pdims[0]; j++) {
                pin[0] = j;
                pin[1] = i;
                o[0] = A[0][0] * pin[0] + A[0][1] * pin[1] + A[0][3];
                o[1] = A[1][0] * pin[0] + A[1][1] * pin[1] + A[1][3];
                o[2] = A[2][0] * pin[0] + A[2][1] * pin[1] + A[2][3];
                data[ct++] = this.sample(o[0], o[1], o[2], t, ch);
            }
        }
        return data;
    }
}

function linearInterp(x, values) {
    function enforceBounds(x) {
        if (x < 0) {
            return 0;
        } else if (x > 1) {
            return 1;
        } else {
            return x;
        }
    }
    // Split values into four lists
    var x_values = [];
    var r_values = [];
    var g_values = [];
    var b_values = [];
    for (i in values) {
        x_values.push(values[i][0]);
        r_values.push(values[i][1][0]);
        g_values.push(values[i][1][1]);
        b_values.push(values[i][1][2]);
    }

    var i = 1;
    while (x_values[i] < x) {
        i = i + 1;
    }
    i = i - 1;

    var width = Math.abs(x_values[i] - x_values[i + 1]);
    var scaling_factor = (x - x_values[i]) / width;

    // Get the new color values though interpolation
    var r = r_values[i] + scaling_factor * (r_values[i + 1] - r_values[i])
    var g = g_values[i] + scaling_factor * (g_values[i + 1] - g_values[i])
    var b = b_values[i] + scaling_factor * (b_values[i + 1] - b_values[i])

    return [enforceBounds(r), enforceBounds(g), enforceBounds(b)];

}

function drawColormap(CanvasID, colormap, n = 256) {

    var c = document.getElementById(CanvasID);
    var ctx = c.getContext("2d");

    for (i = 0; i <= n; i++) {
        var color = linearInterp(i / n, colormap);
        r = Math.round(255 * color[0]);
        g = Math.round(255 * color[1]);
        b = Math.round(255 * color[2]);
        ctx.fillStyle = 'rgb(' + r + ', ' + g + ', ' + b + ')';
        ctx.fillRect(i, 0, 1, 50);
    }
}

function drawColormapTable(TableID) {

    var Sequential = ['Blues', 'BuGn', 'BuPu',
        'GnBu', 'Greens', 'Greys', 'Oranges', 'OrRd',
        'PuBu', 'PuBuGn', 'PuRd', 'Purples', 'RdPu',
        'Reds', 'YlGn', 'YlGnBu', 'YlOrBr', 'YlOrRd'];
    var Sequential2 = ['afmhot', 'autumn', 'bone', 'cool', 'copper',
        'gist_heat', 'gray', 'hot', 'pink',
        'spring', 'summer', 'winter'];
    var Diverging = ['BrBG', 'bwr', 'coolwarm', 'PiYG', 'PRGn', 'PuOr',
        'RdBu', 'RdGy', 'RdYlBu', 'RdYlGn', 'Spectral',
        'seismic'];
    var Qualitative = ['Accent', 'Dark2', 'Paired', 'Pastel1',
        'Pastel2', 'Set1', 'Set2', 'Set3'];
    var Miscellaneous = ['gist_earth', 'terrain', 'ocean', 'gist_stern',
        'brg', 'CMRmap', 'cubehelix', 'gnuplot',
        'gnuplot2', 'gist_ncar', 'nipy_spectral',
        'jet', 'rainbow', 'gist_rainbow', 'hsv',
        'flag', 'prism']

    if (TableID == 'Sequential') {
        var cm_type = Sequential;
    } else if (TableID == 'Sequential2') {
        var cm_type = Sequential2;
    } else if (TableID == 'Diverging') {
        var cm_type = Diverging;
    } else if (TableID == 'Qualitative') {
        var cm_type = Qualitative;
    } else {
        var cm_type = Miscellaneous;
    }

    for (i in cm_type) {
        var cmap = cm_type[i];
        //appendHTMLbyID(TableID, '<tr><td>'+cmap+'</td><td><canvas id="'+cmap+'" width="1024" height="50"></canvas></td></tr>');
    }
    for (i in cm_type) {
        var cmap = cm_type[i];
        drawColormap(cmap, window[cmap]);
    }
}


