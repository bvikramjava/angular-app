angular.module('projectsitemview', [
	'ngRoute',
	'resources.projects',
	'resources.productbacklog',
	'resources.sprints',
	'resources.tasks',
	'resources.users',
	'resources.comment',
	'resources.document',
	'resources.documenttype',
	'resources.scrumUpdates',
	'services.crud',
	'services.i18nNotifications',
	'ui.bootstrap',
	'security.authorization',
	'filters.pagination',
	'directives.tableactive',
	'directives.icon',
	'directives.propertybar',
	'directives.test',
	'directives.users',
	'directives.comment',
	'directives.scrum',
	'directives.document',
	'directives.ganttChart',
	'directives.pieChart',
	'directives.accordionGroupChevron',
	'underscore',
	'gantt',
	'filters.groupBy',
	'filters.momentsAgo',
	'directives.datelookup'
])

.config([
	'$routeProvider',
	'securityAuthorizationProvider',
	function (
		$routeProvider,
		securityAuthorizationProvider
	) {
		var getAllUsers = [
			'Projects',
			'Users',
			'$route',
			function(Projects, Users, $route){
				return Users.all();
			}
		];

		$routeProvider.when('/projects/new', {
			templateUrl:'projects/projects-edit.tpl.html',
			controller:'ProjectsEditCtrl',
			resolve:{
				project: ['Projects', function(Projects) { return new Projects(); }],
				users: getAllUsers
				// adminUser: securityAuthorizationProvider.requireAdminUser
				// authenticatedUser: securityAuthorizationProvider.requireAuthenticatedUser
			}
		});

		$routeProvider.when('/projects/:projectId/view', {
			templateUrl:'projects/projects-itemview.tpl.html',
			controller:'ProjectsItemViewCtrl',
			resolve:{
				project:[
					'$route',
					'Projects',
					function ($route, Projects) {
						return Projects.getById($route.current.params.projectId);
					}
				]
				// authenticatedUser: securityAuthorizationProvider.requireAuthenticatedUser
			}
		});

		$routeProvider.when('/projects/:projectId', {
			redirectTo: function (routeParams, currentPath) {
				return currentPath + "/view";
			}
		});

	}
])

.controller('ProjectsItemViewCtrl', [
	'$scope',
	'$location',
	'project',
	'ProductBacklog',
	'Sprints',
	'Tasks',
	'Users',
	'Comments',
	'ScrumUpdates',
	'DocumentType',
	'crudListMethods',
	'i18nNotifications',
	'security',
	'$q',
	'filterFilter',
	'dateFilter',
	'paginationFilter',
	'$timeout',
	'_',
	'groupByFilter',
	function (
		$scope,
		$location,
		project,
		ProductBacklog,
		Sprints,
		Tasks,
		Users,
		Comments,
		ScrumUpdates,
		DocumentType,
		crudListMethods,
		i18nNotifications,
		security,
		$q,
		filter,
		dateFilter,
		paginationFilter,
		$timeout,
		_,
		groupByFilter
	) {

		$scope.project = project;
		console.log("fetched project");
		console.log(project);
		$scope.Sprints = Sprints;
		$scope.ProductBacklog = ProductBacklog;
		$scope.Tasks = Tasks;
		$scope.Users = Users;
		$scope.projectsCrudHelpers = {};
		angular.extend($scope.projectsCrudHelpers, crudListMethods('/projects'));

		if( !angular.isDefined($scope.project.projectProfile) ){
			$scope.project.projectProfile = {
				ID : 1
				// name : 'hydra'
			};
		}

		$scope.project.attributesToDisplay = {
			priority : {
				name : 'Priority',
				value : project.priority,
				glyphiconclass : 'glyphicon glyphicon-star',
				icon : 'star',
				ordering : 1
			},
			weight : {
				name : 'Weight',
				value : project.weight,
				glyphiconclass : 'glyphicon glyphicon-tint',
				icon : 'tint',
				ordering : 2
			},
			startdate : {
				name : 'Start Date',
				value : dateFilter(project.startdate, 'shortDate'),
				glyphiconclass : 'glyphicon glyphicon-chevron-right',
				icon : 'chevron-right',
				ordering : 3
			},
			enddate : {
				name : 'End Date',
				value : dateFilter(project.enddate, 'shortDate'),
				glyphiconclass : 'glyphicon glyphicon-chevron-left',
				icon : 'chevron-left',
				ordering : 4
			},
			projectprofile : {
				name : 'Project Profile',
				value : $scope.project.projectProfile.ID,
				glyphiconclass : 'glyphicon glyphicon-wrench',
				icon : 'wrench',
				ordering : 5
			}
		};

		$scope.project.attributeValuesToDisplay = _.values($scope.project.attributesToDisplay);

		// Note that watchCollection compares objects by unique ids until you it explicitly
		// tell it to use angular.equals by passing "true" as the argument
		$scope.$watchCollection('project.attributesToDisplay', function (newObj, oldObj) {
			// Check equality just to be sure, as listeners are fired atleast
			// once during initialization even if the object has not changed
			if( !angular.equals(newObj, oldObj) ){
				$scope.project.attributeValuesToDisplay = _.values($scope.project.attributesToDisplay);
			}
		});

		/**************************************************
		 * Set the roles once we have the user
		 **************************************************/
		// Commenting this for now until we need the currentUser
		// $q.when(security.requestCurrentUser()).then(
		// security.requestCurrentUser().then(
		// 	function (currentUser) {
		// 		if( angular.isDefined(currentUser) ){
		// 			var userroles = project.getUserRoles(currentUser.id);
		// 			$scope.project.attributesToDisplay.userroles = {
		// 				name : 'Your Roles',
		// 				value : userroles,
		// 				ordering : 6
		// 			};
		// 		}
		// 	},
		// 	function (response) {
		// 		console.log("Failed to fetch project roles");
		// 		console.log(response);
		// 	}
		// );

		/**************************************************
		 * Fetch backlog items
		 **************************************************/
		$scope.fetchingBacklogItems = true;
		$scope.backlogItems = [];
		$scope.backlogItemsCrudHelpers = {};
		angular.extend($scope.backlogItemsCrudHelpers, crudListMethods('/projects/'+project.$id()+'/productbacklog'));

		$scope.manageBacklog = function () {
			$location.path('/projects/'+project.$id()+'/productbacklog');
		};

		ProductBacklog.forProject(
			project.$id(),
			function (backlogItems, responsestatus, responseheaders, responseconfig) {
				$scope.backlogItems = backlogItems;
				$scope.fetchingBacklogItems = false;
				console.log("Succeeded to fetch backlog items");
			},
			function (response, responsestatus, responseheaders, responseconfig) {
				console.log("Failed to fetch backlog items");
				$scope.fetchingBacklogItems = false;
				console.log(response);
			}
		);

		$scope.backlogItemsConf = {
			resource : {
				key : 'productbacklog',
				prettyName : 'Product Backlog',
				altPrettyName : 'Backlog Items',
				link : $scope.manageBacklog,
				rootDivClass : 'panel-body',
				itemsCrudHelpers : $scope.backlogItemsCrudHelpers
			},
			pagination : {
				currentPage : 1,
				itemsPerPage : 10
			},
			sortinit : {
				fieldKey : 'priority',
				reverse : true
			},
			tableColumns : [
				{
					key : 'name',
					prettyName : 'Name',
					widthClass : 'col-md-2'
				},
				{
					key : 'description',
					prettyName : 'Description',
					widthClass : 'col-md-4'
				},
				{
					key : 'priority',
					prettyName : 'Priority',
					widthClass : 'col-md-1'
				},
				{
					key : 'estimation',
					prettyName : 'Estimation',
					widthClass : 'col-md-1'
				}
			]
		};

		/**************************************************
		 * Fetch sprints
		 **************************************************/
		$scope.fetchingSprints = true;
		$scope.sprints = [];
		$scope.sprintsCrudHelpers = {};
		angular.extend($scope.sprintsCrudHelpers, crudListMethods('/projects/'+project.$id()+'/sprints'));

		$scope.manageSprints = function () {
			$location.path('/projects/'+project.$id()+'/sprints');
		};

		Sprints.forProject(
			project.$id(),
			function (sprints, responsestatus, responseheaders, responseconfig) {
				$scope.sprints = sprints;
				$scope.fetchingSprints = false;
				// pre process status
				angular.forEach($scope.sprints, function(sprint) {
					sprint.status = sprint.getStatusPretty();
				});
				// console.log("Succeeded to fetch sprints");
			},
			function (response, responsestatus, responseheaders, responseconfig) {
				console.log("Failed to fetch sprints");
				console.log(response);
			}
		);

		$scope.sprintsConf = {
			resource : {
				key : 'sprints',
				prettyName : 'Sprints',
				altPrettyName : 'Sprints',
				link : $scope.manageSprints,
				rootDivClass : 'panel-body',
				itemsCrudHelpers : $scope.sprintsCrudHelpers
			},
			pagination : {
				currentPage : 1,
				itemsPerPage : 10
			},
			sortinit : {
				fieldKey : 'name',
				reverse : false
			},
			tableColumns : [
				{
					key : 'name',
					prettyName : 'Name',
					widthClass : 'col-md-2'
				},
				{
					key : 'startdate',
					type: 'date',
					prettyName : 'Start Date',
					widthClass : 'col-md-2'
				},
				{
					key : 'enddate',
					type: 'date',
					prettyName : 'End Date',
					widthClass : 'col-md-2'
				},
				{
					key : 'status',
					prettyName : 'Status',
					widthClass : 'col-md-2'
				}
			]
		};

		$scope.sprintsGanttConf = {
			resource : {
				key : 'sprints',
				prettyName : 'Sprints',
				altPrettyName : 'Sprints',
				link : $scope.manageSprints,
				rootDivClass : 'panel-body',
				itemsCrudHelpers : $scope.sprintsCrudHelpers,
				color: "#F1C232"
			},
			ganttFieldMap : {
				row:[
					{
						key : 'name',
						ganttKey: 'description'
					}
				],
				task: [
					{
						key : 'name',
						ganttKey: 'subject'
					},
					{
						key : 'startdate',
						type: 'date',
						ganttKey : 'from'
					},
					{
						key : 'enddate',
						type: 'date',
						ganttKey : 'to'
					}
				],
				colorMap: function (sprint) {
					if( sprint.isExpired() ){
						// Note: Do no delete this color history
						// until we have finalised on the colors
						// return "#FFCFC3";
						// return "#E8A729";
						// return "#F0F0F0";
						// return "#7F7F7F";
						// return "#ABABAB";
						return "#D1C4B1";
					}
					if( sprint.isActive() ){
						// return "#FFFE28";
						return "#FED559";
						// return "#93C47D";
					}
					if( sprint.isPlanned() ){
						// return "#10F0FF";
						// return "#62C0DC";
						return "#9FC5F8";
					}
					return "#FFFFFF";
				}
			}
		};

		$scope.sprintsGanttUpdateValidator = function (item, update) {
			var sprint = item;
			if( sprint.isExpired() ){
				return {
					onError: function () {
						i18nNotifications.pushForCurrentRoute('crud.sprints.expired.error', 'error', {});
					}
				};
			}
			return 1;
		};

		/**************************************************
		 * Fetch tasks
		 **************************************************/
		$scope.fetchingTasks = true;
		$scope.tasks = [];
		// console.log("==========================Tasks====================");
		$scope.tasksCrudHelpers = {};
		angular.extend($scope.tasksCrudHelpers, crudListMethods('/projects/'+project.$id()+'/tasks'));

		$scope.manageTasks = function () {
			$location.path('/projects/'+project.$id()+'/tasks');
		};

		Tasks.forProject(
			project.$id(),
			function (tasks, responsestatus, responseheaders, responseconfig) {
				$scope.tasks = tasks;
				// console.log("Tasks=");
				// console.log(tasks);
				$scope.fetchingTasks = false;
				// console.log("Succeeded to fetch tasks");
			},
			function (response, responsestatus, responseheaders, responseconfig) {
				$scope.fetchingTasks = false;
				console.log("Failed to fetch tasks");
				console.log(response);
			}
		);

		$scope.tasksConf = {
			resource : {
				key : 'tasks',
				prettyName : 'Tasks',
				altPrettyName : 'Tasks',
				link : $scope.manageTasks,
				rootDivClass : 'panel-body',
				itemsCrudHelpers : $scope.tasksCrudHelpers
			},
			pagination : {
				currentPage : 1,
				itemsPerPage : 20
			},
			sortinit : {
				fieldKey : 'name',
				reverse : false
			},
			tableColumns : [
				{
					key : 'name',
					prettyName : 'Name',
					widthClass : 'col-md-4'
				},
				// {
				// 	key : 'description',
				// 	prettyName : 'Description',
				// 	widthClass : 'col-md-4'
				// },
				{
					key : 'estimatedStartDate',
					type: 'date',
					prettyName : 'Start Date (Estimated)',
					widthClass : 'col-md-2'
				},
				{
					key : 'estimatedEndDate',
					type: 'date',
					prettyName : 'End Date (Estimated)',
					widthClass : 'col-md-2'
				},
				{
					key : 'priority',
					prettyName : 'Priority',
					widthClass : 'col-md-1'
				},
				{
					key : 'estimation',
					prettyName : 'Estimation',
					widthClass : 'col-md-1'
				},
				{
					key : 'status',
					prettyName : 'Status',
					widthClass : 'col-md-1'
				}
			]
		};

		

		$scope.tasksGanttConf = {
			resource : {
				key : 'tasks',
				prettyName : 'Tasks',
				altPrettyName : 'Tasks',
				link : $scope.manageTasks,
				rootDivClass : 'panel-body',
				itemsCrudHelpers : $scope.tasksCrudHelpers,
				color: "#F1C232"
			},
			ganttFieldMap : {
				row: [
					{
						key : 'name',
						ganttKey: 'description'
					}
				],
				task: [
					{
						key : 'name',
						ganttKey: 'subject'
					},
					{
						key : 'estimatedStartDate',
						type: 'date',
						ganttKey : 'from'
					},
					{
						key : 'estimatedEndDate',
						type: 'date',
						ganttKey : 'to'
					}
				],
				colorMap: function (task) {
					return task.getStatusDef().color;
				}
			}
		};

		$scope.tasksGanttConf2 = {
			resource : {
				key : 'tasks',
				prettyName : 'Tasks',
				altPrettyName : 'Tasks',
				link : $scope.manageTasks,
				rootDivClass : 'panel-body',
				itemsCrudHelpers : $scope.tasksCrudHelpers,
				color: "#F1C232"
			},
			ganttFieldMap : {
				row: [
					{
						key : 'name',
						ganttKey: 'description'
					}
				],
				task: [
					{
						key : 'userStatus',
						ganttKey: 'subject'
					},
					{
						key : 'start',
						type: 'date',
						ganttKey : 'from'
					},
					{
						key : 'stop',
						type: 'date',
						ganttKey : 'to'
					}
				],
				colorMap: function (taskBurst) {
					return taskBurst.color;
				}
			}
		};

		$scope.taskData = function (task) {
			var data = [];
			angular.forEach(task.bursts, function(burst) {
				data.push({
					userStatus: burst.data.status + ", " + burst.data.userId,
					start: burst.start,
					stop: burst.stop || Date.now(),
					// stop: burst.stop,
					color: task.getStatusDef(burst.data.status).color
				});
			});
			return data;
		};

		$scope.tasksGanttUpdateValidator = function (item, update) {
			var task = item;
			// if( task.isExpired() ){
			// 	return {
			// 		onError: function () {
			// 			i18nNotifications.pushForCurrentRoute('crud.tasks.expired.error', 'error', {});
			// 		}
			// 	};
			// }
			return 1;
		};

		$scope.taskToGanttData = function (task) {

		};

		$scope.pieChartConfig = {
			title: 'Tasks',
			groupBy: [
				{
					prettyName: 'Status',
					key: 'status',
					ordering: 1,
					colorMap: function (item) {
						return item.getStatusDef().color;
					},
					groupByOrder: function (item) {
						// console.log("ordering is");
						// console.log(item.getStatusDef().ordering);
						return item.getStatusDef().ordering;
						// return item.getStatusDef().ordering || 0;

					}
				},
				{
					prettyName: 'Type',
					key: 'type',
					ordering: 2,
					colorMap: function (item) {
						return item.getTypeDef().color;
					},
					groupByOrder: function (item) {
						return item.getTypeDef().ordering;
						// return item.getTypeDef().ordering || 0;
					}
				}
			],
			summary: [
				{
					prettyName: 'Estimation',
					prettyNameSuffix: "for",
					key: 'estimation',
					ordering: 1
				},
				{
					prettyName: 'Remaining estimation',
					prettyNameSuffix: "for",
					key: 'remaining',
					ordering: 2
				}
			],
			count: 1,
			// collapse: 0
			collapse: 1,
			cumulative: 0
		};

		/**************************************************
		 * Crud helpers for users
		 **************************************************/

		$scope.usersCrudHelpers = {};
		angular.extend($scope.usersCrudHelpers, crudListMethods('/projects/'+project.$id()+'/users'));

		$scope.viewUser = function (user) {
			$scope.usersCrudHelpers.view(user.$id());
		};

		$scope.manageUsers = function () {
			$location.path('/projects/'+project.$id()+'/edit');
		};

		$scope.getUserRoles = function (user) {
			// console.log("getting user roles");
			return project.getUserRoles(user);
		};

		$scope.usersConf = {
			rootDivClass: 'inline-block',
			roleFunction: "getUserRoles(user)",
			action: "viewUser(user)",
			labelIcon: "edit",
			labelClickAction: "manageUsers()",
			actionName: "Inbox",
			actionIcon: "inbox",
			actionButtonClass: "btn-info",
			helptip: "Edit"
		};

		/**************************************************
		 * Fetch the product owner name
		 **************************************************/
		$scope.fetchingProductOwner = true;
		Users.getById(
			project.productOwner,
			function (productOwner, responsestatus, responseheaders, responseconfig) {
				$scope.productOwner = productOwner;
				$scope.fetchingProductOwner = false;
				var productOwnerName = productOwner.getFullName();
				// console.log("Succeded to fetch product owner");
			},
			function (response, responsestatus, responseheaders, responseconfig) {
				$scope.fetchingProductOwner = false;
				console.log("Failed to fetch product owner");
				console.log(response);
			}
		);

		/**************************************************
		 * Fetch the scrum master name
		 **************************************************/
		$scope.fetchingScrumMaster = true;
		Users.getById(
			project.scrumMaster,
			function (scrumMaster, responsestatus, responseheaders, responseconfig) {
				$scope.fetchingScrumMaster = false;
				$scope.scrumMaster = scrumMaster;
				var scrumMasterName = scrumMaster.getFullName();
				// console.log("Succeded to fetch scrum master");
			},
			function (response, responsestatus, responseheaders, responseconfig) {
				$scope.fetchingScrumMaster = false;
				console.log("Failed to fetch scrum master");
				console.log(response);
			}
		);

		/**************************************************
		 * Fetch stake holders
		 **************************************************/
		$scope.fetchingStakeHolders = true;
		$scope.stakeHolders = [];

		Users.getByIds(
			project.stakeHolders,
			function (stakeHolders) {
				$scope.stakeHolders = stakeHolders;
				$scope.fetchingStakeHolders = false;
			},
			function (response) {
				console.log("Failed to fetch stake holders");
				$scope.fetchingStakeHolders = false;
			}
		);

		/**************************************************
		 * Fetch team members
		 **************************************************/
		$scope.fetchingTeamMembers = true;
		$scope.teamMembers = [];

		Users.getByIds(
			project.teamMembers,
			function (teamMembers) {
				$scope.teamMembers = teamMembers;
				$scope.fetchingTeamMembers = false;
				// console.log("fetched team members");
			},
			function (response) {
				console.log("Failed to fetch team members");
				console.log(response);
			}
		);

		/**************************************************
		 * Fetch scrumupdates and add it in the dashboard page.
		 **************************************************/

		// Initializing the values.
		$scope.showAddButton = true;
		$scope.scrumDates = {};
		$scope.planVal = true;
		$scope.updateVal = true;
		$scope.impedimentVal = true;
		var todaysDate = new Date();
		$scope.scrumDates.startdate = todaysDate;
		// Setting chosendate to current date.
		$scope.scrumDates.chosenDate = new Date();
		$scope.scrumDates.startdate.setDate(todaysDate.getDate() - 7);
		todaysDate = new Date();
		$scope.scrumDates.enddate = todaysDate;
		$scope.currentDate = todaysDate.toDateString();
		$scope.scrumDates.chosenUser = '';

		// Fetch all users on the project.
		var productOwner = [project.productOwner];
		var stakeHolders = project.stakeHolders;
		var teamMembers = project.teamMembers;
		var projectUsers = [productOwner, stakeHolders, teamMembers];
		var projectUserIds = _.union.apply(_, projectUsers);
		Users.getByIds(
			projectUserIds,
			function (users, responsestatus, responseheaders, responseconfig) {
				$scope.scrumusers = users;
				$scope.fetchingUsers = false;
			},
			function (response, responsestatus, responseheaders, responseconfig) {
				$scope.fetchingUsers = false;
			}
		);
		$scope.fetchingscrumupdates = true;
		$scope.scrumupdates = [];
		$scope.updateStatus = {}; // keeps track of the scrum dates which are updated.
		$scope.allScrumUpdates = [];


		// Fetch the scrumupdates for all users based on userids..
		ScrumUpdates.forUsers(
			projectUserIds,
			function (scrumupdates, responsestatus, responseheaders, responseconfig) {
				$scope.allScrumUpdates = scrumupdates;
				$scope.userscrumhash = {};
				for(var updateIndex in scrumupdates){
					if($scope.userscrumhash[scrumupdates[updateIndex].userId]){
						$scope.userscrumhash[scrumupdates[updateIndex].userId].push(scrumupdates[updateIndex]);
					}
					else{
						$scope.userscrumhash[scrumupdates[updateIndex].userId] = [scrumupdates[updateIndex]];
					}
				}

				var filteredUpdates = [];
				var startDate = new Date($scope.scrumDates.startdate);
				var endDate = new Date($scope.scrumDates.enddate);

				var filteredUpdates = [];
				for(var taskIndex in $scope.allScrumUpdates){
					var currentUpdate = $scope.allScrumUpdates[taskIndex];
					var currentDate = new Date(currentUpdate.date);
					if(currentDate >= $scope.scrumDates.startdate && currentDate <= $scope.scrumDates.enddate){
						var dateString = currentDate.toLocaleDateString();
						currentUpdate.dateString = dateString;
						var timeString = currentDate.getHours()+":"+currentDate.getMinutes()+":"+currentDate.getSeconds();
						currentUpdate.timeString = timeString;
						filteredUpdates.push(currentUpdate);
					}
				}
				$scope.scrumupdates = filteredUpdates;
			},
			function (response, responsestatus, responseheaders, responseconfig) {
				console.log("Failed to fetch team members");
				console.log(response);
			}
		);

		function dateCompReverse(obj1, obj2){
			var date1 = new Date(obj1.date);
			var date2 = new Date(obj2.date);
			return date2.getTime() - date1.getTime();
		}

		$scope.showError = function (error) {
			return $scope.$error[error];
		}

		$scope.setValidationClasses = function () {
			return {
				'has-success' : $scope.$valid,
				'has-error' : $scope.$invalid
			};
		}

		// Whenever an user in chosen update the scrumupdate to show only for the chosen user
		$scope.$watch('scrumDates.chosenUser', function(newObj, oldObj){
			// Check equality just to be sure, as listeners are fired atleast
			// once during initialization even if the object has not changed
			if( !angular.equals(newObj, oldObj) ){
				var filteredUpdates = [];
				// Fetch the scrum updates for the user and update the updateStatus hash
				// to contain only the current updates.
				// When the user chosen is showall then make the scrumupadtes contain all list of updates
				console.log("Chosen user is\n");
				console.log($scope.scrumDates.chosenUser);
				if($scope.scrumDates.chosenUser != 'showall' && $scope.scrumDates.chosenUser != ''){
					$scope.scrumupdates = $scope.userscrumhash[$scope.scrumDates.chosenUser];	
				}
				else{
					$scope.scrumupdates = $scope.allScrumUpdates;
				}
				$scope.updateStatus = {};
				for(var taskIndex in $scope.scrumupdates){
					var currentUpdate = $scope.scrumupdates[taskIndex];
					var currentDate = new Date(currentUpdate.date);
					if(currentDate >= $scope.scrumDates.startdate && currentDate <= $scope.scrumDates.enddate){
						$scope.updateStatus[currentDate.toDateString()] = true;
					}
				}			
			}
		});

		$scope.$watch('scrumDates.chosenDate', function(newObj, oldObj){
			// Check equality just to be sure, as listeners are fired atleast
			// once during initialization even if the object has not changed
			if( !angular.equals(newObj, oldObj) ){
				var chosenDate = $scope.scrumDates.chosenDate;
				$scope.scrumDates.startdate = chosenDate;
				var nextChosenDate = new Date(chosenDate);
				nextChosenDate.setDate( nextChosenDate.getDate() + 1 );
				$scope.scrumDates.enddate = nextChosenDate;
			}
		});


		// Changed groupedScrumUpdates whenever the scrumupdates gets changed.
		$scope.$watchCollection('scrumupdates', function (newUpdates, oldUpdates) {
			if (!angular.equals(newUpdates, oldUpdates)) {
				var newSortedUpdates = newUpdates;
				newSortedUpdates.sort(dateCompReverse);
				$scope.groupedScrumUpdates = groupByFilter(newSortedUpdates, "dateString");
			};
		});

		// set validation
		$scope.$watchCollection('scrumDates', function (newObj, oldObj) {
			if( !angular.equals(newObj, oldObj) ){
				if( $scope.scrumDates.startdate >= $scope.scrumDates.enddate ){
					if( !angular.equals(newObj[0], oldObj[0]) ){
						//$scope.scrumDates.startdate.dateField.$setValidity('datecombocheck', false);
					}
					if( !angular.equals(newObj[1], oldObj[1]) ){
						//$scope.scrumDates.startdate.dateField.$setValidity('datecombocheck', false);
					}
				}
				else {
					//$scope.fromDate.dateField.$setValidity('datecombocheck', true);
					//$scope.toDate.dateField.$setValidity('datecombocheck', true);
					// Iterate through the scrum updates and filter only those updates which
					// are in the current date range.
					var filteredUpdates = [];
					for(var taskIndex in $scope.scrumupdates){
						var currentUpdate = $scope.scrumupdates[taskIndex];
						var currentDate = new Date(currentUpdate.date);
						if(currentDate >= $scope.scrumDates.startdate && currentDate <= $scope.scrumDates.enddate){
							var dateString = currentDate.toLocaleDateString();
							currentUpdate.dateString = dateString;
							var timeString = currentDate.getHours()+":"+currentDate.getMinutes()+":"+currentDate.getSeconds();
							currentUpdate.timeString = timeString;
							filteredUpdates.push(currentUpdate);
						}
					}
					$scope.scrumupdates = filteredUpdates;
				}
			}
		});


		function dateCompReverse(obj1, obj2){
			var date1 = new Date(obj1.date);
			var date2 = new Date(obj2.date);
			return date2.getTime() - date1.getTime();
		}
		/**************************************************
		 * ScrumUpdates End.
		 **************************************************/
	}
]);
