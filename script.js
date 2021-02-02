nameMap = [
	"work-experience",
	"projects",
	"education"
];
statusMap = [
	true,
	true,
	true,
];
for(let i = 0;i < nameMap.length;i++){
	expand(i);
}

function toggle(id){
	if(id > statusMap.length || id > nameMap.length) {
		console.err("Collapse button not included in maps");
		return;
	}
	if(statusMap[id] == false){
		expand(id);
	} else {
		collapse(id);
	}
}
function expand(id){
	const btn = document.getElementById(nameMap[id] + "-button");
	btn.innerText = "[–]";

	const textContent = document.getElementById(nameMap[id] + "-content");
	textContent.style.display = "block";

	statusMap[id] = true;
}
function collapse(id){
	const btn = document.getElementById(nameMap[id] + "-button");
	btn.innerText = "[+]";
	
	const textContent = document.getElementById(nameMap[id] + "-content");
	textContent.style.display = "none";

	statusMap[id] = false;

}