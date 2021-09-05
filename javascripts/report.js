
function linkData(data,options) {
  data.Matrix = [];
  data.Links = [];

  // Compute index per node.
  var n = 100;//Math.round(data.Edges.length/10);

  if (typeof data.Nodes==='undefined') {
    data.Nodes=[];
    data.Edges.slice(0,n);
    for (let i=0;i<n;i++) 
    {
      let no={H:i,name:'R'+i,}
      data.Nodes.push(no);
      data.Edges[i].slice(0,n);
    }
  }
  data.Nodes.forEach(function (node, i) {
    node.id = i;
    node.index = i;
    node.count = 0;
    data.Matrix[i] = d3.range(n).map(function (j) {
      return { x: j, y: i, z: 'N' };
    });
  });

  for (var i = 0; i < n; i++) {
    for (var j = i+1; j < n; j++) {
      if (options.thresholdStart <= data.Edges[i][j] && data.Edges[i][j] <= options.thresholdEnd) {
        //console.log('link import [' + i + ',' + j + '] = ' + data.Edges[i][j]);
        data.Matrix[i][j].z = data.Edges[i][j];
        data.Nodes[i].count++;
        data.Links.push({ id: i + '-' + j, source: i, target: j, z: data.Matrix[i][j].z });
      }
    }
  }

  data.NodeLinkStatus = [];
  data.Links.forEach((d) => {
    data.NodeLinkStatus[d.id] = 1;
  });
}

///**************///
function draw_result_grid(id,rlt,fields=null){ 
  if(fields==null) fields=[
    { name: "title", title: "이름",type: "number", width: 50, validate: "required" },
    { name: "type", title: "유형",type: "text", width: 20 ,validate: "required"},
    { name: "subtype", title: "세부유형",type: "text", width: 20 },
    { name: "info", title: "요약",type: "text", width: 50 },
    { name: "date", title: "일시",type: "text", width: 50 },
    { name: "visualize", title: "보기", type: "checkbox", width:15,sorting: false }
  ];
  $(`#${id}`).jsGrid({
      width: "100%",
      height: "400px",
      autoload: true,
      inserting: false,
      editing: true,
      sorting: true,
      paging: true,
      data: rlt,
      fields: fields,
      rowClick: function(args) {
          console.log(args.item + " is clicked");
      },
  });
}

function parsefile(rlt,name,field='title',mode=1){
  let r=[];
  for(let i=0;i<rlt.length;i++) 
  { 
    if (rlt[i][field]==name) {
      if(mode==1) return rlt[i].filename; 
      else r.push(rlt[i].filename);
    }
  }
  return r;
}

let count=0;
function addObject(title,Id,style=null,intro=null,linespace=null) {
  let vdoc=document.getElementById('Result');
  if (title.length==0 || title==null) {}
  else{
    let objl=document.createElement('label');
    objl.innerHTML=`<br><hr style="height:2px;border-width:0;color:red;background-color:red"><br><h3><span style="color:blue">${title}</span><h3>`;
    vdoc.appendChild(objl);    
  }
  if (intro!=null && intro.length>0){
    let obji=document.createElement('label');
    obji.innerHTML=intro;
    vdoc.appendChild(obji);    
  }
  count=count+1;
  let obj=document.createElement('div');
  obj.id=Id;//+'-'+count;
  if(style!=null) obj.style.cssText=style;
  vdoc.appendChild(obj);    

  if(linespace!==null) {
    let obj2=document.createElement('div');
    obj2.style.height=linespace;
    vdoc.appendChild(obj2);
  }
  return obj
}


async function report_parse(rltjson){
  const list=await rpt_list(rltjson);
  console.log(list.length)
  for (let l=0;l<list.length;l++){
    if(list[l].type=='VOL') {
      await rpt_process_vol(list[l]);
    } else if(list[l].type=='FC') {
      await rpt_process_graph(list[l]);
    } else if(list[l].type=='LIST') {
      await rpt_process_list(list[l]);
    }  
  }
}
function rpt_list(rltjson){
  let description='<p>측정된 결과를 제시합니다.</p>'
  return fetch(rltjson).then(response => { //json file
    return response.json();
  }).then(data => { //그리드 그리기
    let obj=addObject(`#LIST:${rltjson}`,'result-list','width:600px;',`${description}`)    
    draw_result_grid(obj.id,data);
    return data;
  });
}
function rpt_process_list(robj){
  let fields=[
    { name: "name", title: "이름",type: "text", width: 10, validate: "required" },
    { name: "fullname", title: "전체이름",type: "text", width: 20 ,validate: "required"},
    { name: "gI", title: "평균값",type: "number", width: 10 },
    { name: "Z", title: "Z 값",type: "number", width: 10 }
  ];

  return fetch(robj.filename).then(response => { //json file
    return response.json();
  }).then(data => { //그리드 그리기
    let description='<br>';
    if(robj.description.length) description=`<p>${robj.description}</p><br>`;
    let obj=addObject(`${robj.title}:${data[2].labelname}`,`${robj.title}`,'width:300px;',`${description}`)    
    draw_result_grid(obj.id,data[2].labels,fields);
    return data;
  });
}
function rpt_process_vol(robj) {
  return new Promise(function(resolve,reject){
    let labelfiles;
    let description='<br>';
    if(robj.description.length) description=`<p>${robj.description}</p><br>`;
    if(robj.reference.length>0) labelfiles=[robj.reference,robj.filename];
    else labelfiles=robj.filename; //[obj.filename,obj.reference];
    let obj2=addObject(`${robj.title}:${robj.filename}`,`${robj.title}`,'width:600px;',`${description}`)    
    new volviewer(obj2.id,labelfiles);
    resolve(1);
  })
}

function rpt_process_graph(robj) {
  let options={radius:40,curveBundle:0.3, distance:2,attraction:2,thresholdStart:0.7,thresholdEnd:1,linkLabel:'off',order:"name",width:'500px',height:'400px'}
  return fetch(robj.filename).then(response => { //json file
      return response.json();
    }).then(data => { 
      linkData(data,options);
      linecolor = d3
          .scaleLinear()
          .domain([options.thresholdStart, (parseFloat(options.thresholdStart) + parseFloat(options.thresholdEnd)) / 2, options.thresholdEnd])
          .range(['blue', 'yellow', 'red']);
      let description='<br>';
      if(robj.description.length) description=`<p>${robj.description}</p><br>`;
      let obj=addObject(`${robj.title}:${robj.filename}`,`${robj.title}`,'width:600px;height:600px;',`${description}`)    
      edgeBundleView('#'+obj.id,data,options)
      let obj1=addObject('',`${robj.title}-rect`,'width:600px;height:600px;','')    
      matrixView('#'+obj1.id,data,options)

      let obj2=addObject('','FC_scale','width:200px;','','30px')    
      drawScale('#'+obj2.id,linecolor) ;

      return data;
    });
}
