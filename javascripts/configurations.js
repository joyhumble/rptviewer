
    let diag_items=[ "정상", "질환1", "질환2", "질환3" ];
    let analysis_mode=["fMRI","DTI","PET","VBM","EEG"];
    let analysis_items=["Default","SPM","FC","STAT","VBM","SEED"];
    let confidence_items= [ "매우확신", "어느정도확신", "어느정도불확신", "매우불확신" ];
    let DATA_OPTIONS={
        reginfo:[
            { name:"subjectID", title:'등록번호', type: "number", width:20, validate:"required"},
            { name:"age", title:'나이', type: "number", width:20, validate:"required"},
            { name: "sex", title: "성별", type: "select", items:["남","여"],width:15,sorting: false },
            { name: "description", title: "증상",type: "text", width: 200 },
            { name: "diagnosis", title: "예상진단명", type: "select", items:diag_items,width: 30 ,validate: "required"},            
            { name: "comment", title: "진단소견",type: "text", width: 200 },
            { name: "date", title: "일시",type: "text", width: 20 },
            { name: "physicianID", title: "의뢰자ID",type: "text", width: 20 }            
        ]
    }
    
    let ANAYLSIS_OPTIONS ={        
        fMRI_mode: [
            { name:"smri", title:'T1 MRI', type: "file", width:20, validate:"required"},
            { name:"fmri", title:'fMRI', type: "file", width:20, validate:"required"},
            { name:"TR", title:'TR', type: "number", width:5, validate:"required"},   
            { name: "analysis", title: "분석기법", type: "select", items:analysis_items,width: 30},    
            { name: "analysis2", title: "추가분석기법", type: "select", items:analysis_items,width: 30},    
            { name: "comment", title: "비고",type: "text", width: 200 },
            { name: "date", title: "일시",type: "text", width: 20 },      
        ],
        PET_mode: [
            { name:"smri", title:'T1 MRI', type: "file", width:20, validate:"required"},
            { name:"pet", title:'PET', type: "file", width:20, validate:"required"},
            { name: "analysis", title: "분석기법", type: "select", items:analysis_items,width: 30},    
            { name: "analysis2", title: "추가분석기법", type: "select", items:analysis_items,width: 30},    
            { name: "comment", title: "비고",type: "text", width: 200 },
            { name: "date", title: "일시",type: "text", width: 20 },      
        ],
        EEG_mode: [
            { name:"eeg", title:'EEG', type: "file", width:20, validate:"required"},
            { name:"fsamp", title:'샘플링주파수', type: "number", width:5, validate:"required"},   
            { name: "analysis", title: "분석기법", type: "select", items:analysis_items,width: 30},    
            { name: "analysis2", title: "추가분석기법", type: "select", items:analysis_items,width: 30},    
            { name: "comment", title: "비고",type: "text", width: 200 },
            { name: "date", title: "일시",type: "text", width: 20 },      
        ]
    }
    
    let DIAG_OPTIONS= {
        diaginfo: [
            { name: "ID", title: "등록번호",type: "number", width: 20, validate: "required" },
            { name: "diagnosis", title: "진단명", type: "select", items:diag_items, width: 30 ,validate: "required"},
            { name: "confidence", title: "진단확신도",type: "select", items:confidence_items, width: 20},
            { name: "diagnosis2", title: "2차진단명",type: "select", items:diag_items, width: 30 }, 
            { name: "description", title: "근거",type: "text", width: 200 },
            { name: "comment", title: "진단소견",type: "text", width: 200 },
            { name: "date", title: "일시",type: "text", width: 20 },
            { name: "expertID", title: "판독가ID",type: "text", width: 20 }
        ],
    };