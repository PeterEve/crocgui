CrocGui.directive('settings', ['$rootScope', '$timeout', function($rootScope, $timeout) {
	return {
		restrict: 'E',
		scope: {},
		templateUrl: '../views/settings.html',
		link: function($scope) {
			$scope.version = require("package.json").version

			$scope.setDownloadLocation = (option) => {
				switch(option) {
					case "documents":
						$scope.settings.downloadFolder = process.env.USERPROFILE + '\\Documents'
					case "downloads":
						$scope.settings.downloadFolder = process.env.USERPROFILE + '\\Downloads'
						break
					case "pictures":
						$scope.settings.downloadFolder = process.env.USERPROFILE + '\\Pictures'
						break
					default:
						let newpath = document.getElementById("downloadpath").value
						if (newpath != undefined && newpath.length) {
							$scope.settings.downloadFolder = newpath
						}
						break
				}
				$scope.saveConfig()
				$timeout(() => { $scope.$apply()})
			}

			$scope.loadConfig = () => {
				if (FS.existsSync("./config.json")) {
					$scope.settings = require("./config.json").settings
				} else {
					$scope.settings = {
						downloadFolder: process.env.USERPROFILE + '\\Documents'
					}
					$scope.saveConfig()
				}
				$rootScope.settings = $scope.settings
			}

			$scope.saveConfig = () => {
				let existing = {
					uploads: [],
					downloads: [],
					settings: {}
				}
				try {
					existing = require("./config.json")
				} catch(e) {}
				existing.settings = $scope.settings
				FS.writeFileSync("./config.json", JSON.stringify(existing), {encoding: 'utf-8'})
				$rootScope.settings = $scope.settings
				$rootScope.$broadcast("settings")
			}

			$scope.showDebugLog = () => {
				if (FS.existsSync("./package.nw/")) {
					CP.execSync('start "" "' + process.cwd() + "\\package.nw")
				} else {
					CP.execSync('start "" "' + process.cwd())
				}
			}

			$scope.loadConfig()
		}
	}
}])