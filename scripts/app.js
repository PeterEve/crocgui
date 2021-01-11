const FS = require("fs")
const CP = require("child_process")

let CrocGui = angular.module('CrocGui', [])

CrocGui.controller('Main', ['$document', '$rootScope', '$scope', '$timeout',
	function Controller($document, $rootScope, $scope, $timeout) {
		// Setup Winston
		const Winston = require("winston")
		try { FS.unlinkSync("debug.log")} catch(e) { }
		$rootScope.Logger = Winston.createLogger({
			level: 'info',
			format: Winston.format.json(),
			defaultMeta: {service: 'user-service'},
			transports: [
				new Winston.transports.File({ filename: 'debug.log'})
			]
		})
		$rootScope.nw = nw

		// Admin
		let Win = nw.Window.get()

		Win.menu = null

		// Tab management
		$scope.tabs = {
			send: true,
			receive: false,
			settings: false
		}

		$scope.changeTab = (target) => {
			$scope.tabs = {
				send: false,
				receive: false,
				settings: false
			}
			$scope.tabs[target] = true
		}
	}
])

CrocGui.directive('changelog', function() {
	return {
		restrict: 'E',
		scope: {},
		templateUrl: '../views/changelog.html'
	}
})