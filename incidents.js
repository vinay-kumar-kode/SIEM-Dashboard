// ======================================
// Sentinel SIEM - Incident Management
// incidents.js
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

// ---------- Analysts ----------

const analysts=[
"John",
"Alice",
"David",
"Michael",
"Sophia"
];

// ---------- Incident Data ----------

let incidentNumber=1001;

let incidents=[

{
id:"INC-1001",
time:getCurrentTime(),
priority:"CRITICAL",
title:"SQL Injection Attack",
assigned:"John",
status:"Open"
},

{
id:"INC-1002",
time:getCurrentTime(),
priority:"HIGH",
title:"Port Scan Detected",
assigned:"Alice",
status:"In Progress"
},

{
id:"INC-1003",
time:getCurrentTime(),
priority:"MEDIUM",
title:"Multiple Failed Login",
assigned:"David",
status:"Closed"
}

];

// ---------- Load Incidents ----------

function loadIncidents(data=incidents){

let html="";

let open=0;
let progress=0;
let closed=0;

data.forEach((incident,index)=>{

if(incident.status==="Open") open++;

if(incident.status==="In Progress") progress++;

if(incident.status==="Closed") closed++;

let priorityClass=incident.priority.toLowerCase();

let statusClass="";

if(incident.status==="Open")
statusClass="open";

else if(incident.status==="In Progress")
statusClass="progress";

else
statusClass="closed";

html+=`

<tr>

<td>${incident.id}</td>

<td>${incident.time}</td>

<td class="${priorityClass}">
${incident.priority}
</td>

<td>${incident.title}</td>

<td>${incident.assigned}</td>

<td class="${statusClass}">
${incident.status}
</td>

<td>

<button
class="assign-btn"
onclick="assignIncident(${index})">

Assign

</button>

<button
class="close-btn"
onclick="closeIncident(${index})">

Close

</button>

</td>

</tr>

`;

});

document.getElementById("incidentTable").innerHTML=html;

document.getElementById("totalIncidents").innerHTML=data.length;

document.getElementById("openIncidents").innerHTML=open;

document.getElementById("progressIncidents").innerHTML=progress;

document.getElementById("closedIncidents").innerHTML=closed;

}

loadIncidents();

// ---------- Search ----------

document.getElementById("searchIncident")
.addEventListener("keyup",function(){

const value=this.value.toLowerCase();

const filtered=incidents.filter(incident=>

incident.id.toLowerCase().includes(value)||

incident.title.toLowerCase().includes(value)||

incident.assigned.toLowerCase().includes(value)

);

loadIncidents(filtered);

});

// ---------- Status Filter ----------

document.getElementById("statusFilter")
.addEventListener("change",function(){

const status=this.value;

if(status==="ALL"){

loadIncidents();

return;

}

const filtered=incidents.filter(
incident=>incident.status===status
);

loadIncidents(filtered);

});

// ---------- Assign ----------

function assignIncident(index){

const analyst=

analysts[Math.floor(Math.random()*analysts.length)];

incidents[index].assigned=analyst;

incidents[index].status="In Progress";

loadIncidents();

}

// ---------- Close ----------

function closeIncident(index){

incidents[index].status="Closed";

loadIncidents();

}

// ---------- Random Data ----------

const attacks=[

"SQL Injection Attack",
"Port Scan Detected",
"Malware Infection",
"Brute Force Attack",
"DDoS Attempt",
"XSS Attack",
"Privilege Escalation",
"Unauthorized Access"

];

const priorities=[

"MEDIUM",
"HIGH",
"CRITICAL"

];

// ---------- Auto Incident ----------

function createIncident(){

incidentNumber++;

const newIncident={

id:"INC-"+incidentNumber,

time:getCurrentTime(),

priority:priorities[
Math.floor(Math.random()*priorities.length)
],

title:attacks[
Math.floor(Math.random()*attacks.length)
],

assigned:"Unassigned",

status:"Open"

};

incidents.unshift(newIncident);

if(incidents.length>100){

incidents.pop();

}

loadIncidents();

}

// Create a new incident every 15 seconds

setInterval(createIncident,15000);
