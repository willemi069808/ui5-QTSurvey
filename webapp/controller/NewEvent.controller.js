sap.ui.define([
	"ns.QTSurvey/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/m/MessageToast",
	"sap/m/MessageBox"
], function (BaseController, Filter, MessageToast, MessageBox) {
	"use strict";

	return BaseController.extend("ns.QTSurvey.controller.NewEvent", {

		__targetName: "NewEvent",

		__qrCode: null,

		onRouteMatched: function(){
			var oModel = this.getComponentModel(),
				oUser = oModel.getProperty("/user");

			oModel.setProperty("/showQRCode", false);

			oModel.setProperty("/layout", "OneColumn");

			if (!oUser){
				this._getUserDetails()
					.then(
						function (oData) {
							var oModel = this.getComponentModel();
							oModel.setProperty("/user",oData);
							this._eraseNewEvent();

						}.bind(this)
					)
					.catch(
						function (err){
							if (err){
								console.log(
									err
								);
							}
						}
					);
			}
			else {
				this._eraseNewEvent();
			}
		},

		onNavBack: function(){
			this.getRouter().navTo(
				"Main",
				{},
				false
			);
		},

		_eraseNewEvent: function(){
			var oModel = this.getComponentModel(),
				oNewEvent = {
					EventID: this._generateUuidv4(),
					user: oModel.getProperty("/user/name"),
					userName: oModel.getProperty("/user/firstName") + " " + oModel.getProperty("/user/lastName"),
					customer: "",
					products: "",
					eventDate: this._roundTimeQuarterHour(new Date())
				};

			oModel.setProperty("/new", oNewEvent);
			oModel.setProperty("/showQRCode", false);
			oModel.setProperty("/generatingQRCode", false);

			if (this.__qrCode){
				this.__qrCode.clear();
			}
		},

		__checkIfNewEventIsOk: function(){
			var oNewEvent = this.getComponentModel().getProperty("/new");
			return	(oNewEvent.customer !== "") &&
					// (oNewEvent.products !== "") &&
					(oNewEvent.customer !== null);
		},

		onCreateEventAndShowQRCodeButtonPress: function(){
			var oModel = this.getComponentModel(),
				oODataModel = this.getComponentModel("oDataModel"),
				oNewEvent = oModel.getProperty("/new"),
				bNewEventIsOk = this.__checkIfNewEventIsOk();

			if (bNewEventIsOk){
				oModel.setProperty("/generatingQRCode", true);

				oODataModel.create(
					"/EventSet",
					oNewEvent,
					{
						success: function(data){
							MessageToast.show(this.getTranslation("eventCreated"));
							oModel.setProperty("/showQRCode", true);
							setTimeout(
								function(){
									this.__prepareQRCode();
								}.bind(this),
								500
							);
						}.bind(this),

						error: function(err){
							MessageToast.show(err);
						}.bind(this)
					}
				);
			}
			else{
				MessageBox.error(this.getTranslation("pleaseInsertAllMandatoryFields"));
			}

		},

		__prepareQRCode: function(){
			var oModel = this.getComponentModel(),
				oNewEvent = oModel.getProperty("/new"),
				oParamModel = this.getComponentModel("params"),
				sUrl = oParamModel.getProperty("/qualtricsUri") + "/" + oParamModel.getProperty("/surveyId") + "?EventID=" + oNewEvent.EventID;

			if (!this.__qrcode) {
				this.__qrCode = new QRCode(document.getElementById("qrcode"), {
					colorDark : "#ffffff",
					colorLight : "#000000"
				});
			}

			this.__qrCode.makeCode(sUrl);

			oModel.setProperty("/generatingQRCode", false);
		}

	});

});
