// ======================================
// Sentinel SIEM - Reports Module
// reports.js
// ======================================

// ---------- Current Time ----------

function getCurrentTime() {

    const now = new Date();

    return now.toLocaleString("en-IN",{
        day:"2-digit",
        month:"short",
        year:"numeric",
        hour:"2-digit",
        minute:"2-digit",
        second:"2-digit",
        hour12:false
    });

}

// ---------- Live Clock ----------

function updateClock(){

    document.getElementById("clock").innerHTML=getCurrentTime();

}

updateClock();

setInterval(updateClock,1000);

// ---------- Animated Counters ----------

function animateCounter(id,target,suffix=""){

    let count=0;

    const timer=setInterval(()=>{

        count++;

        document.getElementById(id).innerHTML=count+suffix;

        if(count>=target){

            clearInterval(timer);

        }

    },15);

}

animateCounter("logsCount",1250);
animateCounter("alertsCount",180);
animateCounter("incidentCount",52);
animateCounter("threatScore",76,"%");

// ---------- Weekly Events Chart ----------

const weeklyChart=new Chart(

document.getElementById("weeklyChart"),

{

type:"line",

data:{

labels:[
"Mon",
"Tue",
"Wed",
"Thu",
"Fri",
"Sat",
"Sun"
],

datasets:[{

label:"Security Events",

data:[120,180,150,220,260,240,310],

borderWidth:3,

fill:false,

tension:.4

}]

},

options:{

responsive:true,

plugins:{

legend:{

labels:{

color:"white"

}

}

},

scales:{

x:{

ticks:{

color:"white"

}

},

y:{

ticks:{

color:"white"

}

}

}

}

}

// ---------- Threat Distribution ----------

);

const pieChart=new Chart(

document.getElementById("pieChart"),

{

type:"doughnut",

data:{

labels:[

"SQL Injection",

"Port Scan",

"Malware",

"Brute Force"

],

datasets:[{

data:[25,35,20,20]

}]

},

options:{

responsive:true,

plugins:{

legend:{

labels:{

color:"white"

}

}

}

}

}

// ---------- CSV Export ----------

);

document.getElementById("csvBtn")

.addEventListener("click",()=>{

let csv="Category,Count\n";

csv+="Logs,1250\n";

csv+="Alerts,180\n";

csv+="Incidents,52\n";

csv+="Threat Score,76\n";

const blob=new Blob([csv],{

type:"text/csv"

});

const url=URL.createObjectURL(blob);

const a=document.createElement("a");

a.href=url;

a.download="SIEM_Report.csv";

a.click();

URL.revokeObjectURL(url);

});

// ---------- PDF Export ----------

document.getElementById("pdfBtn")

.addEventListener("click",()=>{

window.print();

});

// ---------- Dynamic Updates ----------

setInterval(()=>{

// Increase statistics

const logs=document.getElementById("logsCount");

logs.innerHTML=parseInt(logs.innerHTML)+Math.floor(Math.random()*5);

const alerts=document.getElementById("alertsCount");

alerts.innerHTML=parseInt(alerts.innerHTML)+Math.floor(Math.random()*2);

// Update Weekly Chart

weeklyChart.data.datasets[0].data.push(
Math.floor(Math.random()*350)
);

weeklyChart.data.datasets[0].data.shift();

weeklyChart.update();

},10000);
