import React from 'react';
import { bilingual } from '../panchangam/helpers';
import { RASHIS } from './horoscopeCalculator';

const CELL_POSITIONS = {
  11: [1, 1], 0: [1, 2], 1: [1, 3], 2: [1, 4],
  10: [2, 1], 3: [2, 4], 9: [3, 1], 4: [3, 4],
  8: [4, 1], 7: [4, 2], 6: [4, 3], 5: [4, 4],
};

const shortPlanetName = (planet, language) => {
  if (language === 'te') return planet.name.te;
  if (language === 'en') return planet.name.en.slice(0, 3);
  return planet.name.en.slice(0, 3);
};

function SouthIndianChart({ report, chartData, type = 'd1', language = 'both', compact = false }) {
  const signKey = type === 'd9' ? 'navamsaSign' : 'sign';
  const ascendantSign = chartData?.ascendantSign ?? (type === 'd9' ? report.ascendant.navamsaSign : report.ascendant.sign);
  const planetsForChart = chartData?.planets || report.planets;
  const title = chartData?.title || (type === 'd9'
    ? { te: 'నవాంశ చక్రం', en: 'D9 Navamsa' }
    : { te: 'రాశి చక్రం', en: 'D1 Rashi' });

  return (
    <figure className={`horoscope-chart ${compact ? 'is-compact' : ''}`} aria-label={bilingual(title, language)}>
      <div className="horoscope-chart-grid">
        {RASHIS.map((rashi) => {
          const [row, column] = CELL_POSITIONS[rashi.index];
          const planets = planetsForChart.filter((planet) => chartData ? planet.sign === rashi.index : planet[signKey] === rashi.index);
          return (
            <div
              className={`horoscope-chart-cell ${ascendantSign === rashi.index ? 'has-lagna' : ''}`}
              key={rashi.key}
              style={{ gridRow: row, gridColumn: column }}
            >
              <span className="horoscope-chart-sign">{bilingual(rashi.name, language)}</span>
              <div className="horoscope-chart-planets">
                {ascendantSign === rashi.index && <b title="Lagna">Lg</b>}
                {planets.map((planet) => (
                  <b key={planet.key} title={bilingual(planet.name, language)}>
                    {planet.symbol} {shortPlanetName(planet, language)}{planet.retrograde ? '℞' : ''}
                  </b>
                ))}
              </div>
            </div>
          );
        })}
        <div className="horoscope-chart-center">
          <span>{chartData?.key?.toUpperCase() || type.toUpperCase()}</span>
          <strong>{bilingual(title, language)}</strong>
          <small>{report.person.name}</small>
        </div>
      </div>
      <figcaption>{bilingual(title, language)} · South Indian fixed-sign format</figcaption>
    </figure>
  );
}

export default SouthIndianChart;
