// ======================================
// Sentinel SIEM - Logs Module
// logs.js
// ======================================

// ---------- Current Time ----------

function getCurrentTime() {

    const now = new Date();

    return now.toLocaleString("en-IN", {

        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false

    });

}

// ---------- Live Clock ----------

function updateClock() {

    document.getElementById("clock").innerHTML = getCurrentTime();

}

updateClock();

setInterval(updateClock,1000);

// ---------- Sample Data ----------

let logs = [

{
time:getCurrentTime(),
ip:"192.168.1.10",
severity:"LOW",
event:"User Login",
status:"Closed"
},

{
time:getCurrentTime(),
ip:"192.168.1.21",
severity:"MEDIUM",
event:"Failed Login",
status:"Monitoring"
},

{
time:getCurrentTime(),
ip:"192.168.1.35",
severity:"HIGH",
event:"Port Scan",
status:"Open"
},

{
time:getCurrentTime(),
ip:"192.168.1.50",
severity:"CRITICAL",
event:"SQL Injection",
status:"Open"
}

];

// ---------- Load Logs ----------

function loadLogs(data = logs){

    let html = "";

    data.forEach(log=>{

        let severityClass = log.severity.toLowerCase();

        let statusClass="";

        if(log.status==="Open")
            statusClass="status-open";

        else if(log.status==="Monitoring")
            statusClass="status-monitor";

        else
            statusClass="status-closed";

        html+=`

        <tr>

            <td>${log.time}</td>

            <td>${log.ip}</td>

            <td class="${severityClass}">
                ${log.severity}
            </td>

            <td>${log.event}</td>

            <td class="${statusClass}">
                ${log.status}
            </td>

        </tr>

        `;

    });

    document.getElementById("logsTable").innerHTML=html;

    document.getElementById("logCount").innerHTML=data.length;

}

loadLogs();

// ---------- Search ----------

document.getElementById("searchBox").addEventListener("keyup",function(){

    const value=this.value.toLowerCase();

    const filtered=logs.filter(log=>

        log.ip.toLowerCase().includes(value) ||

        log.event.toLowerCase().includes(value)

    );

    loadLogs(filtered);

});

// ---------- Severity Filter ----------

document.getElementById("severityFilter").addEventListener("change",function(){

    const level=this.value;

    if(level==="ALL"){

        loadLogs();

        return;

    }

    const filtered=logs.filter(log=>log.severity===level);

    loadLogs(filtered);

});

// ---------- Random Data ----------

const attacks=[

"SQL Injection",
"Port Scan",
"Malware",
"Brute Force",
"Unauthorized Login",
"File Modified",
"DDoS Attack",
"XSS Attack"

];

const severities=[

"LOW",
"MEDIUM",
"HIGH",
"CRITICAL"

];

const statuses=[

"Closed",
"Monitoring",
"Open"

];

function randomIP(){

    return "192.168.1."+Math.floor(Math.random()*254+1);

}

// ---------- Live Logs ----------

function addRandomLog(){

    const newLog={

        time:getCurrentTime(),

        ip:randomIP(),

        severity:severities[Math.floor(Math.random()*4)],

        event:attacks[Math.floor(Math.random()*attacks.length)],

        status:statuses[Math.floor(Math.random()*3)]

    };

    logs.unshift(newLog);

    if(logs.length>100){

        logs.pop();

    }

    loadLogs();

}

setInterval(addRandomLog,5000);

// ---------- Export CSV ----------

document.getElementById("exportBtn").addEventListener("click",()=>{

    let csv="Time,IP,Severity,Event,Status\n";

    logs.forEach(log=>{

        csv+=`${log.time},${log.ip},${log.severity},${log.event},${log.status}\n`;

    });

    const blob=new Blob([csv],{type:"text/csv"});

    const url=URL.createObjectURL(blob);

    const a=document.createElement("a");

    a.href=url;

    a.download="siem_logs.csv";

    a.click();

    URL.revokeObjectURL(url);

});
