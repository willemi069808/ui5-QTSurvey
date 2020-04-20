sap.ui.define([
	"ns.QTSurvey/controller/BaseController",
	"sap/ui/model/Filter",
	"sap/m/MessageBox"
], function (BaseController, Filter, MessageBox) {
	"use strict";

	return BaseController.extend("ns.QTSurvey.controller.EventDetails", {

		__targetName: "EventDetails",

		__qrCode: null,

		onRouteMatched: function(oEvent){
			var oModel = this.getComponentModel(),
				sPath = ["",oEvent.getParameter("arguments").path].join("/");

			oModel.setProperty("/layout", "TwoColumnsMidExpanded");
			oModel.setProperty("/detailsLoaded", true);

			this.getView().bindElement({
				model: "oDataModel",
				path: sPath,
				events: {
					"change": function(oEvent){
						var oEventDetails = this.getView().getBindingContext("oDataModel").getObject(),
							sEventID = oEventDetails.EventID,
							oParamModel = this.getComponentModel("params"),
							sUrl = oParamModel.getProperty("/qualtricsUri") + "/" + oParamModel.getProperty("/surveyId") + "?EventID=" + sEventID;

						if (this.__qrCode){
							this.__qrCode.clear();
						}
						else{
							this.__qrCode = new QRCode(document.getElementById("event_qrcode"), {
								colorDark : "#ffffff",
								colorLight : "#000000"
							});
						}

						this.__qrCode.makeCode(sUrl);

						this._sUrl = sUrl;

					}.bind(this)
				}
			});
		},

		onNavBack: function(){
			this.getComponentModel().setProperty("/detailsLoaded", false);
			this.getRouter().navTo(
				"Main",
				{},
				false
			);
		},

		onSlidesBackgroundColorSelectionChange: function(oEvent){
			var sKey = oEvent.getParameter("item").getKey(),
				oConfig = {};

			switch(sKey){
				case "black":
					this.__qrCode._htOption.colorLight="#000000";
					this.__qrCode._htOption.colorDark="#ffffff";
				break;

				case "white":
					this.__qrCode._htOption.colorLight="#ffffff";
					this.__qrCode._htOption.colorDark="#000000";
				break;
			}

			this.__qrCode.clear();
			this.__qrCode.makeCode(this._sUrl);

		},

		onQRCodeDownloadButtonPress: function(oEvent){
			var oQRCodeElement = $("div#event_qrcode"),
				oEventDetails = oEvent.getSource().getBindingContext("oDataModel").getObject(),
				sBackGroundColor = this.getTranslation(this.getView().byId("slideBackgroundSB").getSelectedKey());

			download(
				oQRCodeElement.children()[1].src,
				oEventDetails.customer + " " + sBackGroundColor + " QR Code.png"
			);
		}

	});

});
