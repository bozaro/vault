import { module, test } from 'qunit';
import { setupRenderingTest } from 'ember-qunit';
import { find, render, findAll, triggerEvent } from '@ember/test-helpers';
import { hbs } from 'ember-cli-htmlbars';
import { format, formatRFC3339, subMonths } from 'date-fns';
import { formatChartDate } from 'core/utils/date-formatters';
module('Integration | Component | clients/line-chart', function (hooks) {
  setupRenderingTest(hooks);
  const CURRENT_DATE = new Date();
  hooks.beforeEach(function () {
    this.set('xKey', 'foo');
    this.set('yKey', 'bar');
    this.set('dataset', [
      {
        foo: 1,
        bar: 4,
      },
      {
        foo: 2,
        bar: 8,
      },
      {
        foo: 3,
        bar: 14,
      },
      {
        foo: 4,
        bar: 10,
      },
    ]);
  });

  test('it renders', async function (assert) {
    await render(hbs`
    <div class="chart-container-wide">
      <Clients::LineChart @dataset={{this.dataset}} @xKey={{this.xKey}} @yKey={{this.yKey}} />
      </div>
    `);

    assert.dom('[data-test-line-chart]').exists('Chart is rendered');
    assert
      .dom('[data-test-line-chart="plot-point"]')
      .exists({ count: this.dataset.length }, `renders ${this.dataset.length} plot points`);

    findAll('[data-test-line-chart="x-axis-labels"] text').forEach((e, i) => {
      assert
        .dom(e)
        .hasText(`${this.dataset[i][this.xKey]}`, `renders x-axis label: ${this.dataset[i][this.xKey]}`);
    });
    assert.dom(find('[data-test-line-chart="y-axis-labels"] text')).hasText('0', `y-axis starts at 0`);
  });

  test('it renders upgrade data', async function (assert) {
    this.set('dataset', [
      {
        foo: format(subMonths(CURRENT_DATE, 4), 'M/yy'),
        bar: 4,
      },
      {
        foo: format(subMonths(CURRENT_DATE, 3), 'M/yy'),
        bar: 8,
      },
      {
        foo: format(subMonths(CURRENT_DATE, 2), 'M/yy'),
        bar: 14,
      },
      {
        foo: format(subMonths(CURRENT_DATE, 1), 'M/yy'),
        bar: 10,
      },
    ]);
    this.set('upgradeData', [
      {
        id: '1.10.1',
        previousVersion: '1.9.2',
        timestampInstalled: formatRFC3339(subMonths(CURRENT_DATE, 2)),
      },
    ]);
    await render(hbs`
    <div class="chart-container-wide">
      <Clients::LineChart 
        @dataset={{this.dataset}} 
        @upgradeData={{this.upgradeData}} 
        @xKey={{this.xKey}} 
        @yKey={{this.yKey}} 
      />
    </div>
    `);
    assert.dom('[data-test-line-chart]').exists('Chart is rendered');
    assert
      .dom('[data-test-line-chart="plot-point"]')
      .exists({ count: this.dataset.length }, `renders ${this.dataset.length} plot points`);
    assert
      .dom(find(`[data-test-line-chart="upgrade-${this.dataset[2][this.xKey]}"]`))
      .hasStyle({ opacity: '1' }, `upgrade data point ${this.dataset[2][this.xKey]} has yellow highlight`);
  });

  test('it renders tooltip', async function (assert) {
    const tooltipData = [
      {
        month: format(subMonths(CURRENT_DATE, 4), 'M/yy'),
        clients: 4,
        new_clients: {
          clients: 0,
        },
      },
      {
        month: format(subMonths(CURRENT_DATE, 3), 'M/yy'),
        clients: 8,
        new_clients: {
          clients: 4,
        },
      },
      {
        month: format(subMonths(CURRENT_DATE, 2), 'M/yy'),
        clients: 14,
        new_clients: {
          clients: 6,
        },
      },
      {
        month: format(subMonths(CURRENT_DATE, 1), 'M/yy'),
        clients: 20,
        new_clients: {
          clients: 4,
        },
      },
    ];
    this.set('dataset', tooltipData);
    this.set('upgradeData', [
      {
        id: '1.10.1',
        previousVersion: '1.9.2',
        timestampInstalled: formatRFC3339(subMonths(CURRENT_DATE, 2)),
      },
    ]);
    await render(hbs`
    <div class="chart-container-wide">
      <Clients::LineChart 
        @dataset={{this.dataset}} 
        @upgradeData={{this.upgradeData}}
      />
    </div>
    `);

    const tooltipHoverCircles = findAll('[data-test-line-chart] circle.hover-circle');
    for (let [i, bar] of tooltipHoverCircles.entries()) {
      await triggerEvent(bar, 'mouseover');
      let tooltip = document.querySelector('.ember-modal-dialog');
      let { month, clients, new_clients } = tooltipData[i];
      assert
        .dom(tooltip)
        .includesText(
          `${formatChartDate(month)} ${clients} total clients ${new_clients.clients} new clients`,
          `tooltip text is correct for ${month}`
        );
    }
  });

  test('it fails gracefully when upgradeData is an object', async function (assert) {
    this.set('upgradeData', { some: 'object' });
    await render(hbs`
    <div class="chart-container-wide">
    <Clients::LineChart 
    @dataset={{this.dataset}} 
    @upgradeData={{this.upgradeData}} 
    @xKey={{this.xKey}} 
    @yKey={{this.yKey}} 
    />
    </div>
    `);

    assert
      .dom('[data-test-line-chart="plot-point"]')
      .exists({ count: this.dataset.length }, 'chart still renders when upgradeData is not an array');
  });

  test('it fails gracefully when upgradeData has incorrect key names', async function (assert) {
    this.set('upgradeData', [{ incorrect: 'key names' }]);
    await render(hbs`
    <div class="chart-container-wide">
    <Clients::LineChart 
    @dataset={{this.dataset}} 
    @upgradeData={{this.upgradeData}} 
    @xKey={{this.xKey}} 
    @yKey={{this.yKey}} 
    />
    </div>
    `);

    assert
      .dom('[data-test-line-chart="plot-point"]')
      .exists({ count: this.dataset.length }, 'chart still renders when upgradeData has incorrect keys');
  });

  test('it renders empty state when no dataset', async function (assert) {
    await render(hbs`
    <div class="chart-container-wide">
    <Clients::LineChart @noDataMessage="this is a custom message to explain why you're not seeing a line chart"/>
    </div>
    `);

    assert.dom('[data-test-component="empty-state"]').exists('renders empty state when no data');
    assert
      .dom('[data-test-empty-state-subtext]')
      .hasText(
        `this is a custom message to explain why you're not seeing a line chart`,
        'custom message renders'
      );
  });
});
