const EventEmitter = require('events')
const FS = require('fs')
const CP = require('child_process')
const PATH = require('path')
const zip = require("zip-folder")

class Uploader extends EventEmitter {
	constructor(options, Logger) {
		super()

		this.id = Math.floor(Math.random() * Math.floor(10000))
		this.Logger = Logger

		this.filePath = options.filePath
		this.reserve = options.reserve
		this.tmpzip = options.tmpzip
		this.code = options.code

		this.fileName = ''

		this.status = {
			state: "Pending",
			upload: {
				percent: '',
				size: '',
				bitrate: ''
			},
			error: ""
		}
	}

	start() {
		this.stop()
		let crocpath = process.cwd() + '/bin/croc.exe'

		// Check file is real
		if (!FS.existsSync(this.filePath)) {
			this.Logger.info("Uploader " + this.id + ": Missing file")
			this.status.state = "File Missing"
			this.emit('status', this.status)
			return
		}

		// Zip a directory before sending
		if (FS.statSync(this.filePath).isDirectory()) {
			this.Logger.info("Uploader " + this.id + ": Directory supplied, zipping")
			this.prezip()
			return
		}

		// Spawn croc process
		this.CROC = CP.spawn(crocpath, [
			'--yes',
			'--ignoreStdin',
			'send',
			'--code=' + this.code,
			this.filePath
		])

		this.CROC.stderr.on('data', (data) => {
			data = data.toString()
			this.Logger.info("Uploader " + this.id + ": " + data)
			let parsedData = parseMessage(data)

			let statusChanged = false
			if ('bitrate' in parsedData) {
				this.status.upload.bitrate = parsedData.bitrate
				statusChanged = true
			}
			if ('size' in parsedData) {
				this.status.upload.size = parsedData.size
				statusChanged = true
			}
			if ('percent' in parsedData) {
				this.status.upload.percent = parsedData.percent
				statusChanged = true
			}
			if ('code' in parsedData) {
				this.code = parsedData.code
				this.status.state = "Ready"
				statusChanged = true
				this.emit('code')
			}
			if ('fileName' in parsedData) {
				this.fileName = parsedData.fileName
				this.statusChanged = true
			}
			if ('target' in parsedData) {
				this.target = parsedData.target
				this.status.state = "Transfering"
				statusChanged = true
			}
			if (statusChanged) {
				this.emit('status', this.status)
			}
		})

		this.CROC.on('close', () => {
			this.status.upload.bitrate = ''
			if (this.reserve) {
				this.status.state = "Pending"
				this.status.upload.percent = ''
				this.start()
			} else {
				this.status.state = "Done"
				this.status.upload.percent = '100%'
			}
			this.emit('status', this.status)
		})
	}

	prezip() {
		this.tmpzip = true
		this.status.state = "Zipping"
		this.emit('status', this.status)

		let foldername = PATH.basename(this.filePath)
		if (FS.existsSync('./tmp/' + foldername + ".zip")) {
			this.Logger.info("Uploader " + this.id + ": Using existing zipped file")
			this.filePath = process.cwd() + "/tmp/" + foldername + ".zip"
			this.start()
			return
		}

		try { FS.mkdirSync("./tmp") } catch(e) {}

		zip(this.filePath, "./tmp/" + foldername + ".zip", (err) => {
			if (!err) {
				this.Logger.info("Uploader " + this.id + ": Zipped folder and moved to tmp")
				this.filePath = process.cwd() + "/tmp/" + foldername + ".zip"
				this.start()
			} else {
				this.Logger.info("Uploader " + this.id + ": Error zipping folder", err)
			}
		})
	}

	stop() {
		this.Logger.info("Uploader " + this.id + ": Stopping")
		try { this.CROC.kill() } catch(e) {}
		this.CROC = {}
	}
}

function parseMessage(msg) {
	let result = {}
	if (msg.includes("\n")) {
		let lines = msg.split("\n")
		for (var i=0; i<lines.length; i++) {
			result = Object.assign(result, parseMessage(lines[i]))
		}
	} else {
		if (msg.includes('Sending')) {
			if (msg.includes('->')) { // Target ip and port
				result.target = msg.split('(')[1].replace(')', '').replace('->', '')
			} else { // Filename and size
				result.size = msg.split('(')[1].replace(')', '')
				result.fileName = msg.split("'")[1]
			}
		}
		if (msg.includes('Code is:')) { // Receive code
			result.code = msg.split('Code is: ')[1]
		}
		if (msg.includes('|')) { // Progress
			result.percent = msg.match(/[0-9]*\%/g)[0]
			let endblock = msg.match(/\((.*)\)/g)[0].replace("(", "").replace(")", "").split(", ")
			result.bytes = endblock[0]
			result.bitrate = endblock[1]
		}
	}
	return result
}

module.exports = Uploader