const Uploader = require("scripts/agents/uploader.js")
CrocGui.directive('send', ['$rootScope', '$timeout', function($rootScope, $timeout) {
	return {
		restrict: 'E',
		scope: {},
		templateUrl: '../views/send.html',
		link: function($scope) {
			$scope.uploads = []

			$scope.newFileVisible = false
			$scope.newFolderVisible = false
			$scope.newFolderReserve = false

			$scope.showNewFile = () => {
				document.getElementById("newfile").value = ""
				$scope.newFileVisible = true
			}

			$scope.showNewFolder = () => {
				document.getElementById("newfolder").value = ""
				$scope.newFolderVisible = true
			}

			$scope.addUpload = (mode, options) => {
				var newOptions = {
					filePath: "",
					reserve: false,
					code: "",
					tmpzip: false
				}
				if (mode == "file") {
					newOptions.filePath = $scope.newFilePath
					newOptions.reserve = document.getElementById("newfilereserve").checked
					$scope.newFileVisible = false
					$scope.newFilePath = undefined
					document.getElementById("newfilereserve").checked = false
				} else if (mode == "folder") {
					newOptions.filePath = $scope.newFolderPath
					newOptions.reserve = document.getElementById("newfolderreserve").checked
					$scope.newFolderVisible = false
					$scope.newFolderPath = undefined
					document.getElementById("newfolderreserve").checked = false
				} else if (mode == "resume") {
					newOptions = options
				}

				if (newOptions.filePath != undefined && newOptions.filePath.length != 0) {
					let upload = new Uploader(newOptions, $rootScope.Logger)
					upload.start()
					upload.on('status', (status) => {
						$timeout(() => { $scope.$apply() })
					})
					upload.on('code', () => {
						$scope.saveConfig()
					})
	
					$scope.uploads.push(upload)
					$rootScope.Logger.info("Added new upload " + newOptions.filePath)
					$scope.saveConfig()
				}
			}

			$scope.removeUpload = (upload) => {
				upload.stop()
				let index = $scope.uploads.findIndex((element) => {
					return element.id == upload.id
				})
				$scope.uploads.splice(index, 1)
				$scope.saveConfig()
			}

			$scope.setFolderPath = (value) => {
				$scope.newFolderPath = value
				$timeout(() => { $scope.$apply() })
			}

			$scope.setFilePath = (value) => {
				$scope.newFilePath = value
				$timeout(() => { $scope.$apply() })
			}

			$scope.loadConfig = () => {
				let tmpuploads = []
				if (FS.existsSync("./config.json")) {
					tmpuploads = require("./config.json").uploads
				}
				for (var i=0;i<tmpuploads.length;i++) {
					$scope.addUpload(tmpuploads[i])
				}
			}

			$scope.saveConfig = () => {
				let saveUploads = []
				for (var i=0;i<$scope.uploads.length;i++) {
					let upload = $scope.uploads[i]
					saveUploads.push({
						code: upload.code,
						filePath: upload.filePath,
						fileName: upload.fileName,
						tmpzip: upload.tmpzip
					})
				}
				let existing = {
					uploads: [],
					downloads: [],
					settings: {}
				}
				try {
					existing = require("./config.json")
				} catch(e) {}
				existing.uploads = saveUploads
				FS.writeFileSync("./config.json", JSON.stringify(existing), {encoding: 'utf-8'})
			}

			$scope.loadConfig()
		}
	}
}])