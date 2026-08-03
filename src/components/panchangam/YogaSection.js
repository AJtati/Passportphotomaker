import React, { useState } from 'react';
import { Button, ButtonGroup } from 'react-bootstrap';
import NityaYogaSchedule from './NityaYogaSchedule';
import SpecialYogaSchedule from './SpecialYogaSchedule';
import { bilingual } from './helpers';

function YogaSection({ data, city, language }) {
  const [selection, setSelection] = useState('special');
  const phrase = (te, en) => bilingual({ te, en }, language);

  return (
    <section>
      <div className="panchangam-yoga-heading">
        <h3>{phrase('యోగాలు', 'Yogas')}</h3>
        <ButtonGroup size="sm" aria-label="Choose Yoga type">
          <Button variant={selection === 'special' ? 'primary' : 'outline-secondary'} onClick={() => setSelection('special')}>
            {phrase('విశేష యోగాలు', 'Special Yogas')}
          </Button>
          <Button variant={selection === 'nitya' ? 'primary' : 'outline-secondary'} onClick={() => setSelection('nitya')}>
            {phrase('నిత్య యోగం', 'Nitya Yoga')}
          </Button>
        </ButtonGroup>
      </div>
      <p className="panchangam-yoga-difference">
        <strong>{phrase('వేర్వేరు గణనలు:', 'Different calculations:')}</strong> {phrase('నిత్య యోగం రోజువారీ సూర్య–చంద్ర దీర్ఘాంశాల సంయోగం. నిర్దిష్ట వారం, నక్షత్రం కలిసినప్పుడే విశేష యోగాలు ఏర్పడతాయి.', 'Nitya Yoga is the daily Sun–Moon longitude combination. Special Yogas occur only when particular weekday and Nakshatra combinations match.')}
      </p>
      {selection === 'special'
        ? <SpecialYogaSchedule data={data} city={city} language={language} />
        : <NityaYogaSchedule data={data} city={city} language={language} />}
    </section>
  );
}

export default YogaSection;
