const EventEmitter = require('events')
const FS = require('fs')
const CP = require('child_process')

class Downloader extends EventEmitter {
	constructor(options, Logger) {
		super()

		this.id = Math.floor(Math.random() * Math.floor(10000))

		this.Logger = Logger
		this.code = options.code
		this.downloadFolder = options.downloadFolder

		this.unavailableTimeout = -1
		this.moveWhenDone = false

		this.status = {
			state: "Pending",
			download: {
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
		this.CROC = CP.spawn(crocpath, [
			'--yes',
			'--out=' + this.downloadFolder,
			'--ignoreStdin',
			this.code
		])

		this.CROC.stderr.on('data', (data) => {
			data = data.toString()
			this.Logger.info("Downloader " + this.id + ": " + data)
			let parsedData = parseMessage(data)

			let statusChanged = false
			if ('bitrate' in parsedData) {
				this.status.download.bitrate = parsedData.bitrate
				statusChanged = true
			}
			if ('size' in parsedData) {
				this.status.download.size = parsedData.size
				statusChanged = true
			}
			if ('percent' in parsedData) {
				this.status.download.percent = parsedData.percent
				statusChanged = true
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
			clearTimeout(this.unavailableTimeout)
			if (this.fileName || this.status.state == "Pending") {
				this.status.state = "Done"
				this.status.download.bitrate = ''
				this.status.download.percent = '100%'
				this.emit('status', this.status)
				if (this.moveWhenDone && this.moveWhenDone != this.downloadFolder) {
					FS.renameSync(this.moveWhenDone + "\\" + this.filename, this.downloadFolder + "\\" + this.fileName)
				}
			} else {
				this.status.state = "Bad Code"
				this.status.download.bitrate = ''
				this.status.download.percent = ''
				this.emit('status', this.status)
			}
		})

		this.unavailableTimeout = setTimeout(() => {
			if (this.status.state != "Transferring" && this.status.state != "Done") {
				this.status.state = "Error"
				this.status.error = "No file available for that code"
				this.stop()
			}
		}, 5000)
	}

	migrate(newfolder) {
		switch(this.status.state) {
			case "Pending":
			case "Error":
				// Restart with new downloadFolder
				this.downloadFolder = newfolder
				this.start()
				break
			case "Transferring":
				// Schedule to move the files when done
				if (!this.moveWhenDone) {
					this.moveWhenDone = this.downloadFolder
				}
				this.downloadFolder = newfolder
				break
			case "Done":
				// Move existing files
				FS.renameSync(this.downloadFolder + "\\" + this.filename, newfolder + "\\" + this.fileName)
				this.downloadFolder = newfolder
				break
		}
	}

	stop() {
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
		if (msg.includes('Receiving')) {
			if (msg.includes('<-')) { // Receive ip and port
				result.target = msg.split('(')[1].replace(')', '').replace('<-', '')
			} else { // Filename and size
				result.size = msg.split('(')[1].replace(')', '')
				result.fileName = msg.split("'")[1]
			}
		}
		if (msg.includes('|')) { // Progress
			result.percent = msg.match(/[0-9]*\%/g)[0]
			let endblock = msg.match(/\((.*)\)/g)[0].replace("(", "").replace(")", "").split(", ")
			result.bytes = endblock[0]
			result.bitrate = endblock[1]
		}
	}
	return result // {target, size, fileName, percent, bytes, bitrate}
}

module.exports = Downloader