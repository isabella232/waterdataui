import {select, selectAll} from 'd3-selection';
import sinon from 'sinon';

import * as utils from 'ui/utils';
import config from 'ui/config';

import {configureStore} from 'ml/store';
import {Actions as ivTimeSeriesDataActions} from 'ml/store/instantaneous-value-time-series-data';
import {Actions as statisticsDataActions} from 'ml/store/statistics-data';
import {Actions as timeZoneActions} from 'ml/store/time-zone';
import {Actions as floodDataActions} from 'ml/store/flood-inundation';

import {attachToNode} from './index';

const TEST_STATE = {
    ivTimeSeriesData: {
        timeSeries: {
            'method1:00010:current': {
                points: [{
                    dateTime: 1514926800000,
                    value: 4,
                    qualifiers: ['P']
                }],
                method: 'method1',
                tsKey: 'current:P7D',
                variable: '45807190'
            },
            'method1:00060:current': {
                points: [{
                    dateTime: 1514926800000,
                    value: 10,
                    qualifiers: ['P']
                }],
                method: 'method1',
                tsKey: 'current:P7D',
                variable: '45807197'
            },
            'method1:00060:compare': {
                points: [{
                    dateTime: 1514926800000,
                    value: 10,
                    qualifiers: ['P']
                }],
                method: 'method1',
                tsKey: 'compare:P7D',
                variable: '45807197'
            }
        },
        timeSeriesCollections: {
            'coll1': {
                variable: '45807197',
                timeSeries: ['00060:current']
            },
            'coll2': {
                variable: '45807197',
                timeSeries: ['00060:compare']
            },
            'coll3': {
                variable: '45807197',
                timeSeries: ['00060:median']
            },
            'coll4': {
                variable: '45807190',
                timeSeries: ['00010:current']
            }
        },
        queryInfo: {
            'current:P7D': {
                queryURL: 'http://waterservices.usgs.gov/nwis/iv/sites=05413500&period=P7D&siteStatus=all&format=json',
                notes: {
                    'filter:timeRange':  {
                        mode: 'PERIOD',
                        periodDays: 7
                    },
                    requestDT: 1522425600000
                }
            }
        },
        requests: {
            'current:P7D': {
                timeSeriesCollections: ['coll1']
            },
            'compare:P7D': {
                timeSeriesCollections: ['coll2', 'col4']
            }
        },
        variables: {
            '45807197': {
                variableCode: {
                    value: '00060'
                },
                oid: '45807197',
                variableName: 'Test title for 00060',
                variableDescription: 'Test description for 00060',
                unit: {
                    unitCode: 'unitCode'
                }
            },
            '45807190': {
                variableCode: {
                    value: '00010'
                },
                oid: '45807190',
                variableName: 'Test title for 00010',
                variableDescription: 'Test description for 00010',
                unit: {
                    unitCode: 'unitCode'
                }
            }
        },
        methods: {
            'method1': {
                methodDescription: 'method description'
            }
        }
    },
    statisticsData : {
        median: {
            '00060': {
                '1234': [
                    {
                        month_nu: '2',
                        day_nu: '20',
                        p50_va: '40',
                        begin_yr: '1970',
                        end_yr: '2017',
                        loc_web_ds: 'This method'
                    }, {
                        month_nu: '2',
                        day_nu: '21',
                        p50_va: '41',
                        begin_yr: '1970',
                        end_yr: '2017',
                        loc_web_ds: 'This method'
                    }, {
                        month_nu: '2',
                        day_nu: '22',
                        p50_va: '42',
                        begin_yr: '1970',
                        end_yr: '2017',
                        loc_web_ds: 'This method'
                    }
                ]
            }
        }
    },
    ivTimeSeriesState: {
        currentIVVariableID: '45807197',
        currentIVDateRange: 'P7D',
        showIVTimeSeries: {
            current: true,
            compare: true,
            median: true
        },
        loadingIVTSKeys: []
    },
    ui: {
        width: 400
    },
    floodData: {
        floodLevels: {
            site_no: '07144100',
            action_stage: '20',
            flood_stage: '22',
            moderate_flood_stage: '25',
            major_flood_stage: '26'
        }
    }
};

describe('monitoring-location/components/hydrograph module', () => {
    utils.mediaQuery = jest.fn().mockReturnValue(true);
    utils.wrap = jest.fn();
    config.ivPeriodOfRecord = {
        '00010': {
            begin_date: '01-02-2001',
            end_date: '10-15-2015'
        },
        '00060': {
            begin_date: '04-01-1991',
            end_date: '10-15-2007'
        },
        '00093': {
            begin_date: '11-25-2001',
            end_date: '03-01-2020'
        },
        '00067': {
            begin_date: '04-01-1990',
            end_date: '10-15-2006'
        }
    };

    let graphNode;
    let fakeServer;
    let loadPromise = new Promise(() => null);

    beforeEach(() => {
        let body = select('body');
        body.append('a')
            .attr('id','classic-page-link')
            .attr('href', 'https://fakeserver/link');
        let component = body.append('div')
            .attr('id', 'hydrograph');
        component.append('div').attr('class', 'loading-indicator-container');
        component.append('div').attr('class', 'graph-container');
        component.append('div').attr('class', 'select-time-series-container');
        component.append('div').attr('id', 'iv-data-table-container');

        graphNode = document.getElementById('hydrograph');

        fakeServer = sinon.createFakeServer();
    });

    afterEach(() => {
        fakeServer.restore();
        select('#hydrograph').remove();
        select('#classic-page-link').remove();
    });

    it('expect alert if no siteno defined', () => {
        attachToNode({}, graphNode, {}, loadPromise);
        expect(graphNode.innerHTML).toContain('No data is available');
    });

    describe('Tests for initial data fetching when showOnlyGraph is false (the default)', () => {
        let store;

        beforeEach(() => {
            store = configureStore({
                ivTimeSeriesState: {
                    loadingIVTSKeys: []
                }
            });
        });

        it('loading-indicator is shown until initial data has been retrieved', () => {
            attachToNode(store, graphNode, {
                siteno: '12345678'
            }, loadPromise);

            expect(select(graphNode).select('.loading-indicator').size()).toBe(1);
        });

        it('Expects retrieveIanaTimeZone to be called', () => {
            jest.spyOn(timeZoneActions, 'retrieveIanaTimeZone');
            attachToNode(store, graphNode, {
                siteno: '12345678'
            }, loadPromise);

            expect(timeZoneActions.retrieveIanaTimeZone).toHaveBeenCalled();
        });

        describe('Always retrieve the 7 day data and median statistics', () => {

            beforeEach(() => {
                jest.spyOn(ivTimeSeriesDataActions, 'retrieveIVTimeSeries');
                jest.spyOn(statisticsDataActions, 'retrieveMedianStatistics');
            });

            it('Retrieve if no date parameters are used', () => {
                attachToNode(store, graphNode, {
                    siteno: '12345678',
                    parameterCode: '00065'
                }, loadPromise);

                expect(ivTimeSeriesDataActions.retrieveIVTimeSeries).toHaveBeenCalledWith('12345678');
                expect(statisticsDataActions.retrieveMedianStatistics).toHaveBeenCalledWith('12345678');
            });

            it('Retrieve if period parameters is used', () => {
                attachToNode(store, graphNode, {
                    siteno: '12345678',
                    parameterCode: '00065',
                    period: 'P30D'
                }, loadPromise);

                expect(ivTimeSeriesDataActions.retrieveIVTimeSeries).toHaveBeenCalledWith('12345678');
                expect(statisticsDataActions.retrieveMedianStatistics).toHaveBeenCalledWith('12345678');
            });

            it('Retrieve if startDT and endDT parameters are used', () => {
                attachToNode(store, graphNode, {
                    siteno: '12345678',
                    parameterCode: '00065',
                    startDT: '2010-01-01',
                    endDT: '2010-03-01'
                }, loadPromise);

                expect(ivTimeSeriesDataActions.retrieveIVTimeSeries).toHaveBeenCalledWith('12345678');
                expect(statisticsDataActions.retrieveMedianStatistics).toHaveBeenCalledWith('12345678');
            });
        });

        describe('Retrieve additional data if indicated', () => {
            beforeEach(() => {
                jest.spyOn(ivTimeSeriesDataActions, 'retrieveIVTimeSeries').mockReturnValue(function() {
                    return Promise.resolve({});
                });
                jest.spyOn(ivTimeSeriesDataActions, 'retrieveExtendedIVTimeSeries').mockReturnValue(function() {
                    return Promise.resolve({});
                });
                jest.spyOn(ivTimeSeriesDataActions, 'retrieveUserRequestedIVDataForDateRange').mockReturnValue(function() {
                    return Promise.resolve({});
                });
            });

            it('Expect to not retrieve additional time series if not indicated', () => {
                attachToNode(store, graphNode, {
                    siteno: '12345678',
                    parameterCode: '00065'
                }, loadPromise);

                return new Promise(resolve => {
                    window.requestAnimationFrame(() => {
                        expect(ivTimeSeriesDataActions.retrieveExtendedIVTimeSeries).not.toHaveBeenCalled();
                        expect(ivTimeSeriesDataActions.retrieveUserRequestedIVDataForDateRange).not.toHaveBeenCalled();
                        resolve();
                    });
                });
            });
            it('should retrieve extend time series if period set', () => {
                attachToNode(store, graphNode, {
                    siteno: '12345678',
                    parameterCode: '00065',
                    period: 'P30D'
                }, loadPromise);

                return new Promise(resolve => {
                    window.requestAnimationFrame(() => {
                        expect(ivTimeSeriesDataActions.retrieveExtendedIVTimeSeries).toHaveBeenCalledWith('12345678', 'P30D', '00065');
                        expect(ivTimeSeriesDataActions.retrieveUserRequestedIVDataForDateRange).not.toHaveBeenCalled();
                        resolve();
                    });
                });
            });

            it('should not retrieve data for date range if  time zone has not been fetched', () => {
                attachToNode(store, graphNode, {
                    siteno: '12345678',
                    parameterCode: '00065',
                    startDT: '2010-01-01',
                    endDT: '2010-03-01'
                }, loadPromise);

                return new Promise(resolve => {
                    window.requestAnimationFrame(() => {
                        expect(ivTimeSeriesDataActions.retrieveExtendedIVTimeSeries).not.toHaveBeenCalled();
                        expect(ivTimeSeriesDataActions.retrieveUserRequestedIVDataForDateRange).not.toHaveBeenCalled();
                        resolve();
                    });
                });
            });

            it('should retrieve data for date range if time zone has  been fetched', () => {
                jest.spyOn(timeZoneActions, 'retrieveIanaTimeZone').mockReturnValue(function() {
                    return Promise.resolve({});
                });
                attachToNode(store, graphNode, {
                    siteno: '12345678',
                    parameterCode: '00065',
                    startDT: '2010-01-01',
                    endDT: '2010-03-01'
                }, loadPromise);

                return new Promise(resolve => {
                    window.requestAnimationFrame(() => {
                        expect(ivTimeSeriesDataActions.retrieveExtendedIVTimeSeries).not. toHaveBeenCalled();
                        expect(ivTimeSeriesDataActions.retrieveUserRequestedIVDataForDateRange).toHaveBeenCalledWith('12345678', '2010-01-01', '2010-03-01', '00065');
                        resolve();
                    });
                });
            });
        });
    });

    describe('Tests for initial data fetching when showOnlyGraph is true', () => {
        let store;

        beforeEach(() => {
            store = configureStore({
                ivTimeSeriesState: {
                    loadingIVTSKeys: []
                }
            });

            jest.spyOn(ivTimeSeriesDataActions, 'retrieveIVTimeSeries').mockReturnValue(function() {
                return Promise.resolve({});
            });
            jest.spyOn(ivTimeSeriesDataActions, 'retrieveCustomTimePeriodIVTimeSeries').mockReturnValue(function() {
                return Promise.resolve({});
            });
            jest.spyOn(ivTimeSeriesDataActions, 'retrieveUserRequestedIVDataForDateRange').mockReturnValue(function() {
                return Promise.resolve({});
            });
        });

        it('should retrieve custom time period if period is specified', () => {
            attachToNode(store, graphNode, {
                siteno: '12345678',
                parameterCode: '00065',
                period: 'P20D',
                showOnlyGraph: true
            }, loadPromise);

            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    expect(ivTimeSeriesDataActions.retrieveIVTimeSeries).not.toHaveBeenCalled();
                    expect(ivTimeSeriesDataActions.retrieveCustomTimePeriodIVTimeSeries).toHaveBeenCalledWith('12345678', '00065', 'P20D');
                    expect(ivTimeSeriesDataActions.retrieveUserRequestedIVDataForDateRange).not.toHaveBeenCalled();

                    resolve();
                });
            });
        });

        it('should not retrieve date range for date range parameters if time zone has not been fetched', () => {
            attachToNode(store, graphNode, {
                siteno: '12345678',
                parameterCode: '00065',
                startDT: '2010-01-01',
                endDT: '2010-03-01',
                showOnlyGraph: true
            }, loadPromise);

            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    expect(ivTimeSeriesDataActions.retrieveIVTimeSeries).not.toHaveBeenCalled();
                    expect(ivTimeSeriesDataActions.retrieveCustomTimePeriodIVTimeSeries).not.toHaveBeenCalled();
                    expect(ivTimeSeriesDataActions.retrieveUserRequestedIVDataForDateRange).not.toHaveBeenCalled();
                    resolve();
                });
            });
        });

        it('should  retrieve date range for date range parameters if time zone has been fetched', () => {
            jest.spyOn(timeZoneActions, 'retrieveIanaTimeZone').mockReturnValue(function() {
                return Promise.resolve({});
            });
            attachToNode(store, graphNode, {
                siteno: '12345678',
                parameterCode: '00065',
                startDT: '2010-01-01',
                endDT: '2010-03-01',
                showOnlyGraph: true
            }, loadPromise);

            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    expect(ivTimeSeriesDataActions.retrieveIVTimeSeries).not.toHaveBeenCalled();
                    expect(ivTimeSeriesDataActions.retrieveCustomTimePeriodIVTimeSeries).not.toHaveBeenCalled();
                    expect(ivTimeSeriesDataActions.retrieveUserRequestedIVDataForDateRange).toHaveBeenCalledWith('12345678', '2010-01-01', '2010-03-01', '00065');
                    resolve();
                });
            });
        });

        it('should retrieve time series if no custom period or date range', () => {
            attachToNode(store, graphNode, {
                siteno: '12345678',
                parameterCode: '00065',
                showOnlyGraph: true
            }, loadPromise);

            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    expect(ivTimeSeriesDataActions.retrieveIVTimeSeries).toHaveBeenCalledWith('12345678', ['00065']);
                    expect(ivTimeSeriesDataActions.retrieveCustomTimePeriodIVTimeSeries).not.toHaveBeenCalled();
                    expect(ivTimeSeriesDataActions.retrieveUserRequestedIVDataForDateRange).not.toHaveBeenCalled();
                    resolve();
                });
            });
        });
    });

    describe('graphNode contains the expected elements when no IV time series has been retrieved and showOnlyGraph is false', () => {
        let store;
        config.NWIS_INVENTORY_PAGE_URL = 'https://fakenwis.usgs.gov/inventory';
        let resolvedLoadPromise = Promise.resolve();
        beforeEach(() => {
            jest.spyOn(floodDataActions, 'retrieveWaterwatchData').mockReturnValue(function() {
                return Promise.resolve({});
            });
            jest.spyOn(ivTimeSeriesDataActions, 'retrieveIVTimeSeries').mockReturnValue(function() {
                return Promise.resolve({});
            });
            store = configureStore({
                ...TEST_STATE,
                ivTimeSeriesData: {},
                ivTimeSeriesState: {
                    ...TEST_STATE.ivTimeSeriesState,
                    currentIVVariableID: '',
                    currentIVDateRange: ''

                },
                ui: {
                    windowWidth: 400,
                    width: 400
                }
            });
            attachToNode(store, graphNode, {siteno: '12345678'}, resolvedLoadPromise);
            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    resolve();
                });
            });
        });

        it('should show info alert', () => {
            expect(select('.usa-alert--info').size()).toBe(1);
        });

        it('should use inventory for classic page link', () => {
            expect(select('#classic-page-link').attr('href')).toContain('https://fakenwis.usgs.gov/inventory');
        });
    });

    describe('graphNode contains the expected elements when showOnlyGraph is false', () => {
        /* eslint no-use-before-define: 0 */
        let store;
        let resolvedLoadPromise = Promise.resolve();
        beforeEach(() => {
            jest.spyOn(floodDataActions, 'retrieveWaterwatchData').mockReturnValue(function() {
                return Promise.resolve({});
            });
            jest.spyOn(ivTimeSeriesDataActions, 'retrieveIVTimeSeries').mockReturnValue(function() {
                return Promise.resolve({});
            });
            store = configureStore({
                ...TEST_STATE,
                ivTimeSeriesData: {
                    ...TEST_STATE.ivTimeSeriesData,
                    timeSeries: {
                        ...TEST_STATE.ivTimeSeriesData.timeSeries,
                        'method1:00060:current': {
                            ...TEST_STATE.ivTimeSeriesData.timeSeries['method1:00060:current'],
                            points: [{
                                dateTime: 1514926800000,
                                value: 10,
                                qualifiers: ['P']
                            }, {
                                dateTime: 1514930400000,
                                value: null,
                                qualifiers: ['P', 'FLD']
                            }]
                        }
                    }
                },
                ivTimeSeriesState: {
                    showIVTimeSeries: {
                        current: true,
                        compare: true,
                        median: true
                    },
                    currentIVVariableID: '45807197',
                    currentIVDateRange: 'P7D',
                    currentIVMethodID: 'method1',
                    loadingIVTSKeys: [],
                    ivGraphBrushOffset: null,
                    userInputsForTimeRange: {
                        mainTimeRangeSelectionButton: 'P7D',
                        customTimeRangeSelectionButton: 'days-input',
                        numberOfDaysFieldValue: ''
                    }
                },
                ui: {
                    windowWidth: 400,
                    width: 400
                }
            });

            attachToNode(store, graphNode, {siteno: '12345678'}, resolvedLoadPromise);
            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    resolve();
                });
            });
        });

        it('should not show info alert', () => {
            expect(select('.usa-alert--info').size()).toBe(0);
        });

        it('should not use inventory for classic page link', () => {
            expect(select('#classic-page-link').attr('href')).not.toContain('https://fakenwis.usgs.gov/inventory');
        });

        it('should render the correct number of svg nodes', () => {
            return new Promise(resolve => {
                window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => {
                        // one main hydrograph, brush, slider, legend and two sparklines
                        expect(selectAll('svg').size()).toBe(6);
                        resolve();
                    });
                });
            });
        });

        it('should have a title div', () => {
            const titleDiv = selectAll('.time-series-graph-title');
            expect(titleDiv.size()).toBe(1);
            expect(titleDiv.select('div').text()).toContain('Test title for 00060, method description');
            expect(titleDiv.select('.usa-tooltip').text()).toEqual('Test description for 00060');
        });

        it('should have a defs node', () => {
            expect(selectAll('defs').size()).toBe(1);
            expect(selectAll('defs mask').size()).toBe(1);
            expect(selectAll('defs pattern').size()).toBe(2);
        });

        it('should render time series data as a line', () => {
            // There should be one segment per time-series. Each is a single
            // point, so should be a circle.
            expect(selectAll('.hydrograph-svg .line-segment').size()).toBe(2);
        });

        it('should render a rectangle for masked data', () => {
            expect(selectAll('.hydrograph-svg g.current-mask-group').size()).toBe(1);
        });

        it('should have a point for the median stat data with a label', () => {
            expect(selectAll('#median-points path').size()).toBe(1);
            expect(selectAll('#median-points text').size()).toBe(0);
        });

        it('should have brush element for the hydrograph', () => {
            expect(selectAll('.brush').size()).toBe(1);
        });

        it('should have .cursor-slider-svg element', () => {
            expect(selectAll('.cursor-slider-svg').size()).toBe(1);
        });

        it('should have date control elements', () => {
            expect(selectAll('#ts-daterange-select-container').size()).toBe(1);
            expect(selectAll('#ts-customdaterange-select-container').size()).toBe(1);
        });

        it('should have method select element', () => {
            expect(selectAll('#ts-method-select-container').size()).toBe(1);
        });

        it('should have the select time series element', () => {
            expect(selectAll('#select-time-series').size()).toBe(1);
        });

        it('should have tooltips for the select series table', () => {
            // one for each of the two parameters and the WaterAlert links
            expect(selectAll('table .usa-tooltip').size()).toBe(4);
        });

        it('should have data tables for hydrograph data', () => {
            expect(select('#iv-hydrograph-data-table-container').size()).toBe(1);
            expect(select('#gw-hydrograph-data-table-container').size()).toBe(1);
        });
    });

    describe('hide elements when showOnlyGraph is set to true', () => {
        let store;
        let resolvedLoadPromise = Promise.resolve();
        beforeEach(() => {
            jest.spyOn(ivTimeSeriesDataActions, 'retrieveIVTimeSeries').mockReturnValue(function() {
                return Promise.resolve({});
            });

            store = configureStore({
                ...TEST_STATE,
                ivTimeSeriesData: {
                    ...TEST_STATE.ivTimeSeriesData,
                    timeSeries: {
                        ...TEST_STATE.ivTimeSeriesData.timeSeries,
                        'method1:00060:current': {
                            ...TEST_STATE.ivTimeSeriesData.timeSeries['method1:00060:current'],
                            startTime: 1514926800000,
                            endTime: 1514930400000,
                            points: [{
                                dateTime: 1514926800000,
                                value: 10,
                                qualifiers: ['P']
                            }, {
                                dateTime: 1514930400000,
                                value: null,
                                qualifiers: ['P', 'FLD']
                            }]
                        }
                    }
                },
                ivTimeSeriesState: {
                    showIVTimeSeries: {
                        current: true,
                        compare: true,
                        median: true
                    },
                    currentIVVariableID: '45807197',
                    currentIVDateRange: 'P7D',
                    currentIVMethodID: 'method1',
                    loadingIVTSKeys: [],
                    ivGraphBrushOffset: null
                },
                ui: {
                    windowWidth: 400,
                    width: 400
                }

            });

            attachToNode(store, graphNode, {siteno: '123456788', showOnlyGraph: true}, resolvedLoadPromise);
        });

        it('should not have brush element for the hydrograph', () => {
            expect(selectAll('.brush').size()).toBe(0);
        });

        it('should not have slider-wrapper element', () => {
            expect(selectAll('.slider-wrapper').size()).toBe(0);
        });

        it('should not have date control elements', () => {
            expect(selectAll('#ts-daterange-select-container').size()).toBe(0);
            expect(selectAll('#ts-customdaterange-select-container').size()).toBe(0);
            expect(selectAll('#ts-container-radio-group-and-form-buttons').size()).toBe(0);
        });

        it('should not have method select element', () => {
            expect(selectAll('#ts-method-select-container').size()).toBe(0);
        });

        it('should not have the select time series element', () => {
            expect(selectAll('#select-time-series').size()).toBe(0);
        });

        it('should not have the data table', () => {
            expect(select('#iv-data-table-container').selectAll('table').size()).toBe(0);
        });
    });
});