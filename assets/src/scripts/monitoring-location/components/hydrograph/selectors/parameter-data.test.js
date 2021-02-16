import config from 'ui/config';

import {getAvailableParameterCodes} from './parameter-data';

describe('monitoring-location/components/hydrograph/selectors/parameter-data', () => {
    config.ivPeriodOfRecord = {
        '00060': {
            begin_date: '1980-01-01',
            end_date: '2020-01-01'
        },
        '00061': {
            begin_date: '1980-02-01',
            end_date: '2020-02-01'
        },
        '00010': {
            begin_date: '1980-03-01',
            end_date: '2020-03-01'
        },
        '72019': {
            begin_date: '1980-04-01',
            end_date: '2020-04-01'
        }

    };
    config.gwPeriodOfRecord = {
        '72019': {
            begin_date: '1980-03-31',
            end_date: '2020-03-31'
        },
        '62611': {
            begin_date: '1980-05-01',
            end_date: '2020-05-01'
        }
    };
    const TEST_STATE = {
        ivTimeSeriesData: {
            timeSeries: {
                '12345:current:00060': {
                    description: '00060',
                    tsKey: 'current:P7D',
                    variable: 'code0',
                    points: [{x: 1, y: 2}]
                },
                '13456:current:00061': {
                    description: '00061',
                    tsKey: 'current:P7D',
                    variable: 'code1',
                    points: [{x: 2, y: 3}]
                },
                '13457:current:00061': {
                    description: '00061',
                    tsKey: 'current:P7D',
                    variable: 'code1',
                    points: [{x: 4, y: 6}]
                },
                'current:00010': {
                    description: '00010',
                    tsKey: 'current:P7D',
                    variable: '52331281',
                    points: [{value: 4}]
                },
                'current:00010F': {
                    description: '00010',
                    tsKey: 'current:P7D',
                    variable: '52331281F',
                    points: [{value: 4}]
                },
                'current:72019': {
                    description: '72019',
                    tsKey: 'current:P7D',
                    variable: '52331280',
                    points: [{x: 3, y: 4}]
                }
            },
            variables: {
                'code0': {
                    oid: 'code0',
                    variableDescription: 'code0 desc',
                    variableCode: {
                        value: '00060'
                    }
                },
                'code1': {
                    oid: 'code1',
                    variableDescription: 'code1 desc',
                    variableCode: {
                        value: '00061'
                    }
                },
                '52331281': {
                    oid:'52331281',
                    variableDescription: 'Temperature C',
                    variableCode: {
                        value: '00010'
                    }
                },
                '52331281F': {
                    oid:'52331281F',
                    variableDescription: 'Temperature F',
                    variableCode: {
                        value: '00010F'
                    }
                },
                '52331280': {
                    oid: '52331280',
                    variableDescription: 'code2 desc',
                    variableCode: {
                        value: '72019'
                    }
                },
                '52331279': {
                    oid: '52331279',
                    variableDescription: 'GW level only 62611',
                    variableCode: {
                        value: '62611'
                    }
                }
            }
        },
        ivTimeSeriesState: {
            currentIVVariableID: 'code0'
        },
        discreteData: {
            groundwaterLevels: {
                '52331280': {
                    variable: {
                        variableCode: {
                            value: '72019',
                            variableID: 52331280
                        },
                        variableName: 'Depth to water level, ft below land surface',
                        variableDescription: 'code2 desc',
                        unit: {
                            unitCode: 'ft'
                        },
                        oid: '52331280'
                    },
                    values: [
                        {
                            value: '16.98',
                            qualifiers: [
                                '1'
                            ],
                            dateTime: 1479320640000
                        }]
                },
                '52331279': {
                    variable: {
                        variableCode: {
                            value: '62611',
                            variableID: 52331279
                        },
                        variableName: 'Groundwater level above NAVD 1988',
                        variableDescription: 'Groundwater level 62611',
                        unit: {
                            unitCode: 'ft'
                        },
                        oid: '52331279'
                    },
                    values: [
                        {
                            value: '15.02',
                            qualifiers: [
                                '1'
                            ],
                            dateTime: 1479320640000
                        }]
                }
            }
        }
    };

    describe('getAvailableParameterCodes', () => {
        it('Return an empty array if no variables for IV or discrete data groundwater levels are defined', () => {
            expect(getAvailableParameterCodes({
                ivTimeSeriesData: {},
                ivTimeSeriesState: {},
                discreteData: {}
            })).toHaveLength(0);
        });

        it('Returns the appropriate variables and metadata', () => {
            const result = getAvailableParameterCodes(TEST_STATE);
            expect(result).toHaveLength(6);
            expect(result[0]).toEqual(expect.objectContaining({
                variableID: 'code0',
                parameterCode: '00060',
                description:'code0 desc',
                selected: true,
                timeSeriesCount: 1,
                periodOfRecord: {
                    begin_date: '1980-01-01',
                    end_date: '2020-01-01'
                }
            }));
            expect(result[0].waterAlert.hasWaterAlert).toBe(true);
            expect(result[0].waterAlert.subscriptionParameterCode).toEqual('00060');

            expect(result[1]).toEqual(expect.objectContaining({
                variableID: '52331280',
                parameterCode: '72019',
                description: 'code2 desc',
                selected: false,
                timeSeriesCount: 1,
                periodOfRecord: {
                    begin_date: '1980-03-31',
                    end_date: '2020-04-01'
                }
            }));
            expect(result[1].waterAlert.hasWaterAlert).toBe(true);
            expect(result[1].waterAlert.subscriptionParameterCode).toEqual('72019');


            expect(result[2]).toEqual(expect.objectContaining({
                variableID: 'code1',
                parameterCode: '00061',
                description:'code1 desc',
                selected: false,
                timeSeriesCount: 2,
                periodOfRecord: {
                    begin_date: '1980-02-01',
                    end_date: '2020-02-01'
                }
            }));
            expect(result[2].waterAlert.hasWaterAlert).toBe(false);

            expect(result[3]).toEqual(expect.objectContaining({
                variableID: '52331279',
                parameterCode: '62611',
                description:'GW level only 62611',
                selected: false,
                timeSeriesCount: 0,
                periodOfRecord: {
                    begin_date: '1980-05-01',
                    end_date: '2020-05-01'
                }
            }));
            expect(result[3].waterAlert.hasWaterAlert).toBe(false);

            expect(result[4]).toEqual(expect.objectContaining({
                variableID: '52331281',
                parameterCode: '00010',
                description:'Temperature C',
                selected: false,
                timeSeriesCount: 1,
                periodOfRecord: {
                    begin_date: '1980-03-01',
                    end_date: '2020-03-01'
                }
            }));
            expect(result[4].waterAlert.hasWaterAlert).toBe(true);
            expect(result[4].waterAlert.subscriptionParameterCode).toEqual('00010');

            expect(result[5]).toEqual(expect.objectContaining({
                variableID: '52331281F',
                parameterCode: '00010F',
                description:'Temperature F',
                selected: false,
                timeSeriesCount: 1,
                periodOfRecord: {
                    begin_date: '1980-03-01',
                    end_date: '2020-03-01'
                }
            }));
            expect(result[5].waterAlert.hasWaterAlert).toBe(true);
            expect(result[5].waterAlert.subscriptionParameterCode).toEqual('00010');
        });
    });
});