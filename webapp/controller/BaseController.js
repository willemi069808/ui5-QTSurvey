sap.ui.define([
	"jquery.sap.global",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"ns.QTSurvey/util/formatter",
	"sap/ui/model/Sorter",
	"sap/ui/model/Filter",
	"sap/ui/core/Fragment"
], function (jQuery, MessageBox, MessageToast, Controller, History, formatter, Sorter, Filter, Fragment) {
	"use strict";

	return Controller.extend("ns.QTSurvey.controller.BaseController", {

		__targetName: null,

		__MESSAGE_BOX_CHANNEL: "message_box",
		__MESSAGE_BOX_EVENT: "fired",

		__TOAST_ERROR: "error",
		__TOAST_INFO: "info",
		__TOAST_WARNING: "warning",
		__TOAST_SUCCESS: "success",

		_tableColumnsSettingsDialog: null,

		formatter: formatter,

		logger: null,

		onInit: function () {
			if (this.__targetName !== undefined && this.__targetName !== null) {
				var targets = typeof this.__targetName === 'string' ? [this.__targetName] : this.__targetName;
				for (var i = 0; i < targets.length; i++) {
					var oRoute = this.getRouter().getRoute(targets[i]);
					if (oRoute){
						oRoute.attachPatternMatched(this._onRouteMatched, this);
					}
				}
			}

			this.logger = this.getOwnerComponent().logger;

		},

		onAfterRendering: function() {
			// get User infos from SCP Session
			this._getUserDetails()
			.then(
				function (oData) {
					var oModel = this.getComponentModel(),
						sInitials = oData.firstName[0].toUpperCase() + oData.lastName[0].toUpperCase();

					oData.initials = sInitials;
					oModel.setProperty("/user",oData);
				}.bind(this)
			)
			.catch(
				function (err){
					if (err){
						MessageBox.error(
							err
						);
					}
				}
			);
		},

		getRouter: function () {
			return sap.ui.core.UIComponent.getRouterFor(this);
		},

		onNavBack: function(){
			this.getRouter().navTo(
				"Main",
				{},
				false
			);
		},

		navTo: function (sRoute, mData, bReplace) {
			this.getRouter().navTo(sRoute, mData, bReplace);
		},

		_onRouteMatched: function (oEvent) {
			var args = oEvent.getParameters().arguments;
			var argsValues = [oEvent, oEvent.getParameters().name];
			for (var key in args) {
				if (args.hasOwnProperty(key)) {
					var obj = args[key];
					argsValues.push(obj);
				}
			}
			this.onRouteMatched.apply(this, argsValues);
		},

		onRouteMatched: function (oEvent, routeName) {
			//Do something here ;)
		},

		getComponentModel: function (modelName) {
			var component = this.getOwnerComponent();
			var model = modelName == null || modelName === undefined ? component.getModel() : component.getModel(modelName);
			return model;
		},

		/**
		 * Getter for the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Get the translation for sKey
		 * @public
		 * @param {string} sKey the translation key
		 * @param {array} aParameters translation paramets (can be null)
		 * @returns {string} The translation of sKey
		 */
		getTranslation: function (sKey, aParameters) {
			if (aParameters === undefined || aParameters === null) {
				return this.getResourceBundle().getText(sKey);
			} else {
				return this.getResourceBundle().getText(sKey, aParameters);
			}

		},

		getFragmentControlById: function(sFragmentId, sSelectListId){
			var sID = Fragment.createId(sFragmentId,sSelectListId);
			return sap.ui.getCore().byId(sID);
		},

		/*******************************************************
		 * EVENT BUS
		 *******************************************************/

		sendEvent: function (channel, event, data) {
			sap.ui.getCore().getEventBus().publish(channel, event, data);
		},

		subscribe: function (channel, event, handler, listener) {
			sap.ui.getCore().getEventBus().subscribe(channel, event, handler, listener);
		},

		unSubscribe: function (channel, event, handler, listener) {
			sap.ui.getCore().getEventBus().unsubscribe(channel, event, handler, listener);
		},

		////////////////
		// WEB SOCKET //
		////////////////
		_getNewEvent: function(sXMLData){
			var parser = new DOMParser(),
    			xmlDoc = parser.parseFromString(sXMLData, "text/xml"),
				properties = xmlDoc.children[0].children[6].children[0].children;

			return {
			    id: properties[0].textContent ,
			    title: properties[1].textContent ,
			    description: properties[2].textContent ,
			    status: properties[3].textContent ,
			    isUrgent: properties[4].textContent ,
			    duration: properties[5].textContent ,
			    createdAt: new Date(properties[6].textContent) ,
			    dueDate: (properties[7].textContent) ? new Date(properties[7].textContent) : null ,
			    approvalData: (properties[8].textContent) ? new Date(properties[8].textContent) : null ,
			    executionStartDate: (properties[9].textContent) ? new Date(properties[9].textContent) : null ,
			    operationStartDate: (properties[10].textContent) ? new Date(properties[10].textContent) : null
			};
		},

		connectToSocket: function(){
			var sSocketUrl =  "wss://node-endpoint.cfapps.eu10.hana.ondemand.com/ws/moc_extension";

			// Instantiate WebSocket
			this._ws = new WebSocket(sSocketUrl); //('wss://saplabendpointunsecure.cfapps.eu10.hana.ondemand.com/ws/moc_extension');

			/*
				Handler for errors in Socket
			*/
			this._ws.onerror = function(event) {
			    console.log("web socket error");
			    var oModel = this.getComponentModel();
			    oModel.setProperty("/wsConnected", false);
			}.bind(this);

			/*
				Callback for Socket opening event
			*/
			this._ws.onopen = function(event) {
			    MessageToast.show("web socket open");
			    var oModel = this.getComponentModel();
			    oModel.setProperty("/wsConnected", true);
			}.bind(this);

			this._ws.onmessage = function(event) {
				try{
					this._oData = this._getNewEvent(event.data);

					this.getComponentModel("oDataModel").refresh(true);

					Toastr.info(
						this.getTranslation("newRequestJustArrived"),
						this.getTranslation("requestHasBeenCreated", [this._oData.id]), {
					  "closeButton": false,
					  "debug": false,
					  "progressBar": false,
					  "preventDuplicates": false,
					  "tapToDismiss": true,
					  "newestOnTop": true,
					  "showEasing": "swing",
					  "hideEasing": "linear",
					  "showMethod": "fadeIn",
					  "hideMethod": "fadeOut",
					  "showDuration": 300,
					  "hideDuration": 1000,
					  "timeOut": 5000,
					  "extendedTimeOut": 1000,
					  "rtl": false,
					  "onShown": null,
					  "onHidden": null,
					  "onclick": function(oEvent){
					  	var sPath = "NotificationSet('{id}')".replace("{id}",this._oData.id);
					  	this.getRouter().navTo(
					  		"Details",
					  		{
					  			path: sPath
					  		},
					  		false
				  		);
					  }.bind(this),
					  "onCloseClick": null
					});
				}
				catch(err){
					console.log(err);
				}
			}.bind(this);
		},

		/**
		 * Private methods
		 */

		_generateUuidv4: function () {
		  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
		    return v.toString(16);
		  });
		},

		_setAppBusy: function(bBusy){
			var oModel = this.getComponentModel();
			oModel.setProperty("/appConfig/busy", bBusy);
		},

		_getUserDetails: function(){
			return new Promise(function(resolve, reject) {
			  $.ajax({
				url: "/services/userapi/currentUser",
					method: "GET",
					dataType: "json",
					context: this,
					success: function(oData){
						resolve(oData);
					},
					error: function(jqXHR, textStatus, errorThrown){
						// var oMessage = this.addMessage("Error retrieving user info", "Error", "", jqXHR.status + " - " + jqXHR.responseText);
						var sMessage = "Error retrieving user info1nError" + jqXHR.status + " - " + jqXHR.responseText;
						reject(sMessage);
					}
				});
			});
		},

		_roundTimeQuarterHour: function(time) {
		    var timeToReturn = new Date(time);

		    timeToReturn.setMilliseconds(0);
		    timeToReturn.setSeconds(0);
		    timeToReturn.setMinutes(Math.round(timeToReturn.getMinutes() / 15) * 15);
		    return timeToReturn;
		}

	});
});
