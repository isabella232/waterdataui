import unionBy from 'lodash/unionBy';
import {createSelector} from 'reselect';

import config from 'ui/config';
import {sortedParameters} from 'ui/utils';

import {getAllGroundwaterLevelVariables} from 'ml/selectors/discrete-data-selector';
import {getCurrentVariableID, getTimeSeries, getVariables} from 'ml/selectors/time-series-selector';

/**
 * Returns a Redux selector function which returns an sorted array of metadata
 * for each available parameter code. Each object has the following properties:
 *      @prop {String} variableID
 *      @prop {String} parameterCode
 *      @prop {String} description
 *      @prop {Boolean} selected - True if this is the currently selected parameter
 *      @prop {Number} timeSeriesCount - count of unique time series for this parameter
 */
export const getAvailableParameterCodes = createSelector(
    getVariables,
    getTimeSeries,
    getAllGroundwaterLevelVariables,
    getCurrentVariableID,
    (ivVariables, timeSeries, gwLevelVariables, currentVariableID) => {
        if (!ivVariables && !gwLevelVariables) {
            return [];
        }
        const allVariables =
            unionBy(ivVariables ? Object.values(ivVariables) : [], gwLevelVariables, (variable) => variable.oid);
        const seriesList = Object.values(timeSeries);

        return sortedParameters(allVariables)
            .map((variable) => {
                const parameterCode = variable.variableCode.value;
                const measuredParameterCode = parameterCode.replace(config.CALCULATED_TEMPERATURE_VARIABLE_CODE, '');
                const hasWaterAlert = config.WATER_ALERT_PARAMETER_CODES.includes(measuredParameterCode);
                let waterAlertDisplayText;
                if (hasWaterAlert) {
                    if (measuredParameterCode === parameterCode) {
                        waterAlertDisplayText = 'Subscribe';
                    } else {
                        waterAlertDisplayText = 'Alerts in C';
                    }
                } else {
                    waterAlertDisplayText = 'N/A';
                }

                return {
                    variableID: variable.oid,
                    parameterCode: parameterCode,
                    description: variable.variableDescription,
                    selected: currentVariableID === variable.oid,
                    timeSeriesCount: seriesList.filter(ts => {
                        return ts.tsKey === 'current:P7D' && ts.variable === variable.oid;
                    }).length,
                    periodOfRecord: config.uvPeriodOfRecord && measuredParameterCode in config.uvPeriodOfRecord ?
                        config.uvPeriodOfRecord[measuredParameterCode] : null,
                    waterAlert: {
                        hasWaterAlert,
                        subscriptionParameterCode: hasWaterAlert ? measuredParameterCode : '',
                        displayText: waterAlertDisplayText,
                        tooltipText: hasWaterAlert ? 'Subscribe to text or email alerts based on thresholds that you set' :
                            `Sorry, there are no WaterAlerts for this parameter (${parameterCode})`
                    }

                };
            });
    }
);
