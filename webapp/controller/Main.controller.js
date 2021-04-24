sap.ui.define([
	"ns.QTSurvey/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/m/MessageBox"
], function (BaseController, Filter, MessageBox) {
	"use strict";

	return BaseController.extend("ns.QTSurvey.controller.Main", {

		__targetName: "Main",
		__userFilter: [],

		__createFiltersForList: function(){
			return this.__userFilter;
		},

		onRouteMatched: function(oEvent){
			var oModel = this.getComponentModel(),
				oUser = oModel.getProperty("/user"),
				sLayout = (oModel.getProperty("/detailsLoaded") ? "TwoColumnsMidExpanded" : "OneColumn");

			oModel.setProperty("/layout", sLayout);

			if (!oUser){
				this._getUserDetails()
					.then(
						function (oData) {
							var oModel = this.getComponentModel();
							oModel.setProperty("/user",oData);
							this.__userFilter = [new Filter("user", "EQ", oData.name)];
							this._filterEventsList();

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
			}
			else{
				this.__userFilter = [new Filter("user", "EQ", oUser.name)];
				this._filterEventsList();
			}
		},

		_filterEventsList: function(){
			var oList = this.getView().byId("eventList");
			oList.getBinding("items").filter(
				this.__createFiltersForList()
			);
		},

		onEventListRefresh: function(oEvent){
			this.getComponentModel("oDataModel").refresh();
			oEvent.getSource().hide();
		},

		onEventListItemPress: function(oEvent){
			var sPath = oEvent.getSource().getBindingContext("oDataModel").getPath().replace("/","");
			this.getRouter().navTo(
				"EventDetails",
				{
					path: sPath
				},
				false
			);
		},

		onNewEventButtonPress: function(){
			this.getRouter().navTo(
				"NewEvent",
				{},
				false
			);
		}

	});

});
