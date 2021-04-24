// Environment variables
require("dotenv").config({ path: "config/variables.env" });

const   express = require("express"),
        logger = require("morgan"),
        axios = require("axios"),
        bodyParser = require("body-parser"),
        // Server port
        port = parseInt(process.env.PORT, 10) || 8000,
        // This will be our application entry. We'll setup our server here.
        http = require("http");

// Set up the express app
const app = express();

// Log requests to the console.
app.use(logger("dev"));
app.set("port", process.env.PORT || 5000);

// Parse incoming requests data (https://github.com/expressjs/body-parser)
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));

/*********************************************************************
 * OBJECT THAT STORES HANA CREDENTIALS TO PERFORM HTTP REQUEST TO IT *
 *********************************************************************/
const oHANARequestConfig = {
    headers: {"Authorization": "Basic " + process.env.HANA_BASE64_CREDENTIALS}
};

const oQualtricsRequestConfig = {
    headers: {"X-API-TOKEN": process.env.QUALTRICS_API_TOKEN}
};

app.post("/dataFromQualtrics", async (req, res) => {
    try{
        const oPayload = req.body,
            sSurveyId = oPayload.SurveyID,
            sResponseId = oPayload.ResponseID,

            sQualtricsUrl = "https://{{qualtrics_tenant_url}}/API/v3/surveys/{{survey}}/responses/{{response}}".replace(
                "{{qualtrics_tenant_url}}", process.env.QUALTRICS_TENANT_URL
            ).replace(
                "{{survey}}", sSurveyId
            ).replace(
                "{{response}}", sResponseId
            );

        const oSurveyResponse = await axios.get(sQualtricsUrl, oQualtricsRequestConfig),
            oValues = oSurveyResponse.data.result.values,
            oData = {
                EventID: oValues.EventID,
                surveyId: sSurveyId,
                responseId: sResponseId,
                QID1: (oValues.QID1) ? oValues.QID1 : 3,
                QID2: (oValues.QID2) ? oValues.QID2 : 0,
                QID5: (oValues.QID5) ? oValues.QID5 : 0,
                QID3_TEXT: (oValues.QID3_TEXT) ? oValues.QID3_TEXT : "",
                responseDate: oValues.startDate,
                locationLatitude: oValues.locationLatitude,
                locationLongitude: oValues.locationLongitude,
                finished: oValues.finished,
                progress: oValues.progress
            };

            console.log(oSurveyResponse.data);
            console.log(oData);

            const oHANAResponse = await axios.post(
                process.env.HANA_STORE_RESPONSES_SERVICE,
                oData,
                oHANARequestConfig
            );

        res.status(200).send(oHANAResponse.data);
    }
    catch(err){
        console.log(err);
        res.status(500).send(err);
    }
});

/***************************************************************************************
 *     CHECK IF THE SERVICE IS ALREADY BOUND TO QUALTRICS "EVENTSUBSCRIPTIONS" API     *
 * (REFER QUALTRICS API DOC @ https://api.qualtrics.com/reference#create-subscription) *
 ***************************************************************************************/
_checkIfAlreadyRegisteredAndRegisterToQualtrics = new Promise(
    async function(resolve, reject){
        try{

            var oConfigParams = await axios.get(
                process.env.HANA_GET_PARAMETERS_SERVICE,
                oHANARequestConfig
            );
            oConfigParams = oConfigParams.data;

            if (!oConfigParams.qualtrics_event_subscribed || oConfigParams.qualtrics_event_subscribed !== "true"){
                /*
                    Body structure for Qualtrics event subscription API
                    {
                        "topics": "surveyengine.completedResponse.{{survey_id}}",
                        "publicationUrl": {{callback_url}},
                        "encrypt": false
                    }
                */
                var oDataForQualtrics = {
                    topics: "surveyengine.completedResponse.{{survey_id}}".replace(
                         "{{survey_id}}", oConfigParams.surveyId
                    ),
                    publicationUrl: process.env.NODEJS_MIDDLEWARE_URL,
                    encrypt: false
                };

                // POST data to Qualtrics
                const oQualtricsEventSubscriptionResponse = await axios.post(
                    process.env.QUALTRICS_EVENTSUBSCRIPTION_URL,
                    oDataForQualtrics,
                    oQualtricsRequestConfig
                );

                if (oQualtricsEventSubscriptionResponse.status == 200){
                    // Write parameters into HANA ConfigParams table
                    const oConfigParamsToEdit = {
                            surveyId: oConfigParams.surveyId
                        },
                        oUpdateParamsConfirmationResponse = await axios.put(
                            process.env.HANA_REGISTERED_TO_QUALTRICS_CONFIRMATION_SERVICE,
                            oConfigParamsToEdit,
                            oHANARequestConfig
                        );

                    if (oUpdateParamsConfirmationResponse.status != 201){
                        reject("Something went wrong -- abort execution after setting data into HANA ConfigParams");
                    }
                    else{
                        console.log("Registered to Qualtrics!");
                        resolve("ok");
                    }
                }
                else{
                    reject("Something went wrong -- abort execution after setting eventsubscription to Qualtrics API");
                }
            }
            else{
                console.log("Already registered to Qualtrics. Nothing changed in HANA!");
                resolve("ok");
            }
        }
        catch(e){
            reject(e);
        }
    }.bind(this)
);

_checkIfAlreadyRegisteredAndRegisterToQualtrics.then(
    function(data){
        const server = http.createServer(app);
        server.listen((port), () => {
            console.log(`Express running → PORT ${port}`);
        });;

        module.exports = app;
    }.bind(this)
);
