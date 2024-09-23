import { Activity } from '@ghostfolio/api/app/order/interfaces/activities.interface';
import {
  activityDummyData,
  symbolProfileDummyData,
  userDummyData
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator-test-utils';
import {
  PerformanceCalculationType,
  PortfolioCalculatorFactory
} from '@ghostfolio/api/app/portfolio/calculator/portfolio-calculator.factory';
import { CurrentRateService } from '@ghostfolio/api/app/portfolio/current-rate.service';
import { CurrentRateServiceMock } from '@ghostfolio/api/app/portfolio/current-rate.service.mock';
import { RedisCacheService } from '@ghostfolio/api/app/redis-cache/redis-cache.service';
import { RedisCacheServiceMock } from '@ghostfolio/api/app/redis-cache/redis-cache.service.mock';
import { ConfigurationService } from '@ghostfolio/api/services/configuration/configuration.service';
import { ExchangeRateDataService } from '@ghostfolio/api/services/exchange-rate-data/exchange-rate-data.service';
import { PortfolioSnapshotService } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service';
import { PortfolioSnapshotServiceMock } from '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service.mock';
import { parseDate } from '@ghostfolio/common/helper';

import { Big } from 'big.js';
import { last } from 'lodash';

jest.mock('@ghostfolio/api/app/portfolio/current-rate.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    CurrentRateService: jest.fn().mockImplementation(() => {
      return CurrentRateServiceMock;
    })
  };
});

jest.mock(
  '@ghostfolio/api/services/queues/portfolio-snapshot/portfolio-snapshot.service',
  () => {
    return {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      PortfolioSnapshotService: jest.fn().mockImplementation(() => {
        return PortfolioSnapshotServiceMock;
      })
    };
  }
);

jest.mock('@ghostfolio/api/app/redis-cache/redis-cache.service', () => {
  return {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    RedisCacheService: jest.fn().mockImplementation(() => {
      return RedisCacheServiceMock;
    })
  };
});

describe('PortfolioCalculator', () => {
  let configurationService: ConfigurationService;
  let currentRateService: CurrentRateService;
  let exchangeRateDataService: ExchangeRateDataService;
  let portfolioCalculatorFactory: PortfolioCalculatorFactory;
  let portfolioSnapshotService: PortfolioSnapshotService;
  let redisCacheService: RedisCacheService;

  beforeEach(() => {
    configurationService = new ConfigurationService();

    currentRateService = new CurrentRateService(null, null, null, null);

    exchangeRateDataService = new ExchangeRateDataService(
      null,
      null,
      null,
      null
    );

    portfolioSnapshotService = new PortfolioSnapshotService(null);

    redisCacheService = new RedisCacheService(null, null);

    portfolioCalculatorFactory = new PortfolioCalculatorFactory(
      configurationService,
      currentRateService,
      exchangeRateDataService,
      portfolioSnapshotService,
      redisCacheService
    );
  });

  describe('get current positions', () => {
    it.only('with NVEI.TO buys and sells to close position', async () => {
      jest.useFakeTimers().setSystemTime(parseDate('2022-06-01').getTime());

      const activities: Activity[] = [
        {
          ...activityDummyData,
          date: new Date('2021-09-16'),
          fee: 0,
          quantity: 1.569,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CAD',
            dataSource: 'YAHOO',
            name: 'Nuvei Corporation',
            symbol: 'NVEI.TO'
          },
          type: 'BUY',
          unitPrice: 177.2
        },
        {
          ...activityDummyData,
          date: new Date('2021-11-15'),
          fee: 0,
          quantity: 1,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CAD',
            dataSource: 'YAHOO',
            name: 'Nuvei Corporation',
            symbol: 'NVEI.TO'
          },
          type: 'BUY',
          unitPrice: 137.31
        },
        {
          ...activityDummyData,
          date: new Date('2021-11-15'),
          fee: 0,
          quantity: 0.569,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CAD',
            dataSource: 'YAHOO',
            name: 'Nuvei Corporation',
            symbol: 'NVEI.TO'
          },
          type: 'SELL',
          unitPrice: 136.46
        },
        {
          ...activityDummyData,
          date: new Date('2021-12-01'),
          fee: 0,
          quantity: 2,
          SymbolProfile: {
            ...symbolProfileDummyData,
            currency: 'CAD',
            dataSource: 'YAHOO',
            name: 'Nuvei Corporation',
            symbol: 'NVEI.TO'
          },
          type: 'SELL',
          unitPrice: 115.0
        },
      ];

      expect(activities).toHaveLength(4);

      const portfolioCalculator = portfolioCalculatorFactory.createCalculator({
        activities,
        calculationType: PerformanceCalculationType.TWR,
        currency: 'CAD',
        userId: userDummyData.id
      });

      const portfolioSnapshot = await portfolioCalculator.computeSnapshot();

      const investments = portfolioCalculator.getInvestments();

      const investmentsByMonth = portfolioCalculator.getInvestmentsByGroup({
        data: portfolioSnapshot.historicalData,
        groupBy: 'month'
      });

      expect(portfolioSnapshot.historicalData[0]).toEqual({
        date: '2021-09-15',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: 0,
        netWorth: 0,
        totalAccountBalance: 0,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0,
        value: 0,
        valueWithCurrencyEffect: 0
      });

      expect(portfolioSnapshot.historicalData[1]).toEqual({
        date: '2021-09-16',
        investmentValueWithCurrencyEffect: 278.0268,
        netPerformance: 0,
        netPerformanceInPercentage: 0,
        netPerformanceInPercentageWithCurrencyEffect: 0,
        netPerformanceWithCurrencyEffect: 0,
        netWorth: 278.0268,
        totalAccountBalance: 0,
        totalInvestment: 278.0268,
        totalInvestmentValueWithCurrencyEffect: 278.0268,
        value: 278.0268,
        valueWithCurrencyEffect: 278.0268
      });

      expect(portfolioSnapshot.historicalData[78]).toEqual({
        date: '2021-12-02',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: -107.69106,
        netPerformanceInPercentage: -0.3744896791248977,
        netPerformanceInPercentageWithCurrencyEffect: -0.3744896791248977,
        netPerformanceWithCurrencyEffect: -107.69106,
        netWorth: 0,
        totalAccountBalance: 0,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0,
        value: 0,
        valueWithCurrencyEffect: 0
      });


      expect(
        portfolioSnapshot.historicalData[
          portfolioSnapshot.historicalData.length - 1
        ]
      ).toEqual({
        date: '2024-06-01',
        investmentValueWithCurrencyEffect: 0,
        netPerformance: -107.69106,
        netPerformanceInPercentage: -0.3744896791248977,
        netPerformanceInPercentageWithCurrencyEffect: -0.3744896791248977,
        netPerformanceWithCurrencyEffect: -107.69106,
        netWorth: 0,
        totalAccountBalance: 0,
        totalInvestment: 0,
        totalInvestmentValueWithCurrencyEffect: 0,
        value: 0,
        valueWithCurrencyEffect: 0
      });

      expect(portfolioSnapshot).toMatchObject({
        currentValueInBaseCurrency: new Big('0'),
        errors: [],
        hasErrors: false,
        positions: [
          {
            averagePrice: new Big('0'),
            currency: 'CAD',
            dataSource: 'YAHOO',
            dividend: new Big('0'),
            dividendInBaseCurrency: new Big('0'),
            fee: new Big('0'),
            feeInBaseCurrency: new Big('0'),
            firstBuyDate: '2022-03-07',
            grossPerformance: new Big('19.86'),
            grossPerformancePercentage: new Big('0.13100263852242744063'),
            grossPerformancePercentageWithCurrencyEffect: new Big(
              '0.13100263852242744063'
            ),
            grossPerformanceWithCurrencyEffect: new Big('19.86'),
            investment: new Big('0'),
            investmentWithCurrencyEffect: new Big('0'),
            netPerformance: new Big('19.86'),
            netPerformancePercentage: new Big('0.13100263852242744063'),
            netPerformancePercentageWithCurrencyEffectMap: {
              max: new Big('0.13100263852242744063')
            },
            netPerformanceWithCurrencyEffectMap: {
              max: new Big('19.86')
            },
            marketPrice: 87.8,
            marketPriceInBaseCurrency: 87.8,
            quantity: new Big('0'),
            symbol: 'NVEI.TO',
            tags: [],
            timeWeightedInvestment: new Big('151.6'),
            timeWeightedInvestmentWithCurrencyEffect: new Big('151.6'),
            transactionCount: 2,
            valueInBaseCurrency: new Big('0')
          }
        ],
        totalFeesWithCurrencyEffect: new Big('0'),
        totalInterestWithCurrencyEffect: new Big('0'),
        totalInvestment: new Big('0'),
        totalInvestmentWithCurrencyEffect: new Big('0'),
        totalLiabilitiesWithCurrencyEffect: new Big('0'),
        totalValuablesWithCurrencyEffect: new Big('0')
      });

      expect(last(portfolioSnapshot.historicalData)).toMatchObject(
        expect.objectContaining({
          netPerformance: 19.86,
          netPerformanceInPercentage: 0.13100263852242744063,
          netPerformanceInPercentageWithCurrencyEffect: 0.13100263852242744063,
          netPerformanceWithCurrencyEffect: 19.86,
          totalInvestmentValueWithCurrencyEffect: 0
        })
      );

      expect(investments).toContain([
        { date: '2021-09-16', investment: new Big('278.0268') }
      ]);
      expect(investments).toContain([
        { date: '2021-12-01', investment: new Big('0') }
      ]);
    });
  });
});
