let fs = require("fs")
let fse = require("fs-extra")
let zip = require("zip-folder")

try { fs.unlinkSync("./crocgui.zip")} catch(e) {}

try { fs.rmdirSync("./build", {recursive: true}) } catch(e) {}

try { fs.mkdirSync("./build") } catch(e) {}

try { fs.mkdirSync("./build/package.nw/") } catch(e) {}

let toCopy = ["bin", "fonts", "node_modules", "scripts", "styles", "views", "index.html", "package.json", "package-lock.json"]

let version = require("./package.json").version

toCopy.forEach((filename) => {
	console.log("Copying", filename)
	fse.copySync("./" + filename, "./build/package.nw/" + filename)
})

fse.copySync("./NW/", "./build")
try {fse.copySync("./build/NW.exe", "./build/crocgui.exe", { overwrite: false }) } catch(e) {}
try {fs.unlinkSync("./build/NW.exe")} catch(e) {}

zip("./build", "./crocgui " + version + ".zip", (err) => {
	try { fs.rmdirSync("./build", {recursive: true})} catch(e) {}
	console.log("Done Building")
})