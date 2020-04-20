sap.ui.define([
  "sap/ui/test/Opa5",
  "ns/QTSurvey/test/integration/arrangements/Startup",
  "ns/QTSurvey/test/integration/BasicJourney"
], function(Opa5, Startup) {
  "use strict";

  Opa5.extendConfig({
    arrangements: new Startup(),
    pollingInterval: 1
  });

});
