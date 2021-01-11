const Downloader = require("scripts/agents/downloader.js")
CrocGui.directive('receive', ['$rootScope', '$timeout', function($rootScope, $timeout) {
	return {
		restrict: 'E',
		scope: {},
		templateUrl: '../views/receive.html',
		link: function($scope) {
			$scope.downloads = []

			$scope.newDownloadOptions = {}
			$scope.newDownloadVisible = false
			$scope.showNewDownload = () => {
				$scope.newDownloadOptions = {
					code: "",
					downloadFolder: $rootScope.settings.downloadFolder
				}
				$scope.newDownloadVisible = true
			}

			$scope.addDownload = (options) => {
				let download = new Downloader(options, $rootScope.Logger)
				download.start()
				download.on('status', (status) => {
					$timeout(() => { $scope.$apply() })
				})

				$scope.downloads.push(download)
				$scope.newDownloadVisible = false
				$rootScope.Logger.info("Added new download " + options.code)
			}

			$scope.removeDownload = (download) => {
				download.stop()
				let index = $scope.downloads.findIndex((element) => {
					return element.id == download.id
				})
				$scope.downloads.splice(index, 1)
				$scope.saveConfig()
			}

			$scope.showDownloadLocation = () => {
				CP.execSync('start "" "' + $rootScope.settings.downloadFolder)
			}

			$rootScope.$on("settings", () => {
				let changed = false
				for (var i=0;i<$scope.downloads.length;i++) {
					if ($scope.downloads[i].downloadFolder != $rootScope.settings.downloadFolder) {
						changed = true
						$scope.downloads[i].migrate($rootScope.settings.downloadFolder)
					}
				}
				if (changed) {
					$scope.saveConfig()
				}
			})

			let Clipboard = $rootScope.nw.Clipboard.get()
			$scope.clipboardSet = (text) => {
				Clipboard.set(text, 'text')
			}

			$scope.loadConfig = () => {
				let tmpdownloads = []
				if (FS.existsSync("./config.json")) {
					tmpdownloads = require("./config.json").downloads
				}
				for (var i=0;i<tmpdownloads.length;i++) {
					$scope.addDownload(tmpdownloads[i])
				}
			}

			$scope.saveConfig = () => {
				let saveDownloads = []
				for (var i=0;i<$scope.downloads.length;i++) {
					let download = $scope.downloads[i]
					saveDownloads.push({
						code: download.code,
						filePath: download.filePath,
						downloadFolder: download.downloadFolder
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
				existing.downloads = saveDownloads
				FS.writeFileSync("./config.json", JSON.stringify(existing), {encoding: 'utf-8'})
			}

			$scope.loadConfig()
		}
	}
}])