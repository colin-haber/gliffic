var Gliffic = Gliffic || {
	Codepoint: class {
		constructor(index, value, hex, name, category) {
			this.index = index;
			this.value = value;
			this.hex = hex;
			this.name = name;
			this.category = category;
		}
	},
	codepoints: new Array(),
	createAndDisplayTable: function (query) {
		let template = document.querySelector("#template-glyph");
		let set;
		if (query) {
			query = query.toUpperCase();
			if (/^\s*[0-9A-F]+\s*$/.test(query)) { // Numeric
				set = Gliffic.codepoints.filter(codepoint => codepoint.value.includes(query) || codepoint.hex.includes(query) || codepoint.name.includes(query));
			} else {
				set = Gliffic.codepoints.filter(codepoint => query.split(/\s+/).every(term => codepoint.name.toUpperCase().includes(term)));
			}
		} else { // Default to single-byte characters
			set = Gliffic.codepoints.filter(codepoint => codepoint.index < 256);
		}
		set.sort((a, b) => a.index - b.index);
		template.parentElement.querySelectorAll(".glyph").forEach(element => element.remove());
		set.forEach(codepoint => {
			let frag = template.content.cloneNode(true);
			if (!codepoint.category.match(/C[con]/)) frag.querySelector(".glyph-char").textContent = codepoint.value;
			frag.querySelector(".glyph-hex").textContent = codepoint.hex;
			frag.querySelector(".glyph-name").textContent = codepoint.name;
			template.parentElement.appendChild(document.importNode(frag, true));
		});
	},
	unicodeDataPath: "data/UnicodeData-11.0.0d11.txt",
	unicodeVersion: "11.0.0d11"
}
document.addEventListener("DOMContentLoaded", async function (DOMContentLoaded) {
	let params = new URL(window.location).searchParams;
	if (params.has("search")) {
		document.querySelector(".control-search").value = params.get("search");
	}
	document.querySelector(".control").addEventListener("submit", function (submit) {
		submit.preventDefault();
	});
	window.addEventListener("popstate", function (popstate) {
		let params = new URL(window.location).searchParams;
		if (params.has("search")) {
			let query = params.get("search");
			document.querySelector(".control-search").value = query;
			Gliffic.createAndDisplayTable(query);
		} else {
			document.querySelector(".control-search").value = "";
			Gliffic.createAndDisplayTable();
		}
	});
	document.querySelector(".control-search").addEventListener("change", function (change) {
		let query = change.target.value.trim();
		let loc = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
		if (query) loc += `?search=${query}`;
		history.pushState({}, "", loc);
		document.title = query ? `${query} | Gliffic` : "Gliffic";
		Gliffic.createAndDisplayTable(query);
	});
	if (window.localStorage.getItem("unicodeVersion") !== Gliffic.unicodeVersion) {
		indexedDB.deleteDatabase("unicode");
		let codepoints = (await (await window.fetch(Gliffic.unicodeDataPath)).text()).split(/[\r\n]+/).filter(line => line).map(line => {
			let split = line.split(";");
			let index = parseInt(split[0], 16);
			return new Gliffic.Codepoint(index, String.fromCodePoint(index), ...split);
		});
		indexedDB.open("unicode").addEventListener("upgradeneeded", function (upgradeneeded) {
			let unicodeDb = upgradeneeded.target.result;
			let codepointStore = unicodeDb.createObjectStore("codepoints", {
				keyPath: "index"
			});
			codepointStore.transaction.addEventListener("complete", function (complete) {
				let codepointStore = unicodeDb.transaction("codepoints", "readwrite").objectStore("codepoints");
				codepoints.forEach(codepoint => codepointStore.add(codepoint));
			});
		});
		window.localStorage.setItem("unicodeVersion", Gliffic.unicodeVersion);
	}
	indexedDB.open("unicode").addEventListener("success", function (success) {
		let unicodeDb = success.target.result;
		let codepointStore = unicodeDb.transaction("codepoints").objectStore("codepoints");
		codepointStore.openCursor().addEventListener("success", function (success) {
			let cursor = success.target.result;
			if (cursor) {
				Gliffic.codepoints.push(cursor.value);
				cursor.continue();
			} else {
				if (params.has("search")) {
					let query = params.get("search").trim();
					document.title = `${query} | Gliffic`
					Gliffic.createAndDisplayTable(query);
				} else {
					Gliffic.createAndDisplayTable();
				}
			}
		});
	});
});
