// ======================================
// Sentinel SIEM - Alerts Module
// alerts.js
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

// ---------- Sample Alerts ----------

let alerts=[

{
time:getCurrentTime(),
priority:"CRITICAL",
ip:"192.168.1.50",
attack:"SQL Injection",
status:"Open"
},

{
time:getCurrentTime(),
priority:"HIGH",
ip:"192.168.1.25",
attack:"Port Scan",
status:"Open"
},

{
time:getCurrentTime(),
priority:"MEDIUM",
ip:"192.168.1.18",
attack:"Multiple Failed Login",
status:"Acknowledged"
},

{
time:getCurrentTime(),
priority:"HIGH",
ip:"192.168.1.40",
attack:"Malware Detection",
status:"Resolved"
}

];

// ---------- Load Alerts ----------

function loadAlerts(data=alerts){

    let html="";

    let critical=0;
    let open=0;
    let resolved=0;

    data.forEach((alert,index)=>{

        if(alert.priority==="CRITICAL") critical++;
        if(alert.status==="Open") open++;
        if(alert.status==="Resolved") resolved++;

        html+=`

        <tr>

        <td>${alert.time}</td>

        <td class="${alert.priority.toLowerCase()}">
            ${alert.priority}
        </td>

        <td>${alert.ip}</td>

        <td>${alert.attack}</td>

        <td class="${alert.status.toLowerCase().replace(" ","")}">
            ${alert.status}
        </td>

        <td>

        <button
            class="ack-btn"
            onclick="acknowledgeAlert(${index})">

            Acknowledge

        </button>

        <button
            class="resolve-btn"
            onclick="resolveAlert(${index})">

            Resolve

        </button>

        </td>

        </tr>

        `;

    });

    document.getElementById("alertTable").innerHTML=html;

    document.getElementById("totalAlerts").innerHTML=data.length;

    document.getElementById("criticalCount").innerHTML=critical;

    document.getElementById("openCount").innerHTML=open;

    document.getElementById("resolvedCount").innerHTML=resolved;

}

loadAlerts();

// ---------- Search ----------

document.getElementById("searchAlert").addEventListener("keyup",function(){

    const value=this.value.toLowerCase();

    const filtered=alerts.filter(alert=>

        alert.ip.toLowerCase().includes(value) ||

        alert.attack.toLowerCase().includes(value)

    );

    loadAlerts(filtered);

});

// ---------- Filter ----------

document.getElementById("priorityFilter").addEventListener("change",function(){

    const level=this.value;

    if(level==="ALL"){

        loadAlerts();

        return;

    }

    const filtered=alerts.filter(alert=>alert.priority===level);

    loadAlerts(filtered);

});

// ---------- Acknowledge ----------

function acknowledgeAlert(index){

    alerts[index].status="Acknowledged";

    loadAlerts();

}

// ---------- Resolve ----------

function resolveAlert(index){

    alerts[index].status="Resolved";

    loadAlerts();

}

// ---------- Random Data ----------

const attacks=[

"SQL Injection",
"Port Scan",
"Brute Force",
"Malware",
"DDoS Attack",
"XSS Attack",
"Unauthorized Login",
"Ransomware"

];

const priorities=[

"MEDIUM",
"HIGH",
"CRITICAL"

];

function randomIP(){

    return "192.168.1."+Math.floor(Math.random()*254+1);

}

// ---------- Live Alert Generation ----------

function addRandomAlert(){

    const newAlert={

        time:getCurrentTime(),

        priority:priorities[Math.floor(Math.random()*priorities.length)],

        ip:randomIP(),

        attack:attacks[Math.floor(Math.random()*attacks.length)],

        status:"Open"

    };

    alerts.unshift(newAlert);

    if(alerts.length>100){

        alerts.pop();

    }

    loadAlerts();

}

// Generate a new alert every 10 seconds

setInterval(addRandomAlert,10000);
