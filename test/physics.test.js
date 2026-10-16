const test = require('node:test'), assert = require('node:assert/strict');
const { atm, cd0, thrust, clamp, T_IDLE } = require('../js/physics.js');
const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} not within ${tol} of ${b}`);

test('ISA sea level', () => { const a = atm(0); near(a.rho, 1.225, 1e-3); near(a.a, 340.3, .3); near(a.sig, 1, 1e-9); });
test('ISA tropopause (11 km)', () => { const a = atm(11000); near(a.rho, .3639, 2e-3); near(a.a, 295.1, .3); });
test('density falls and clamps below zero altitude', () => { assert.ok(atm(5000).rho < atm(0).rho); assert.equal(atm(-50).rho, atm(0).rho); });
test('speed of sound is constant in the stratosphere', () => near(atm(12000).a, atm(18000).a, 1e-9));

test('cd0 has a transonic rise and falls off supersonic', () => {
  assert.ok(cd0(1.05) > cd0(.5)); assert.ok(cd0(1.2) < cd0(1.05)); assert.equal(cd0(.5), cd0(.8));
});
test('cd0 trK scales wave drag only in the transonic band', () => {
  assert.equal(cd0(.5, { trK: .5 }), cd0(.5)); assert.ok(cd0(1.0, { trK: .5 }) < cd0(1.0));
});

const A = { T_MIL: 76000, T_AB: 127000, ram: .3 };
test('thrust: idle < MIL < AB at sea level', () => {
  const s = atm(0).sig, idle = thrust(A, 0, s, 0, 0), mil = thrust(A, .8, s, 0, 0), ab = thrust(A, 1, s, 0, 0);
  assert.equal(idle, T_IDLE); assert.ok(idle < mil && mil < ab); near(mil, A.T_MIL, 1e-6); near(ab, A.T_AB, 1e-6);
});
test('thrust lapses with altitude', () => {
  assert.ok(thrust(A, .8, atm(9000).sig, .8, 9000) < thrust(A, .8, atm(0).sig, .8, 0));
});
test('clamp', () => { assert.equal(clamp(5, 0, 1), 1); assert.equal(clamp(-5, 0, 1), 0); assert.equal(clamp(.4, 0, 1), .4); });

const { flyout } = require('../js/physics.js');
const AMRAAM = { life: 90, burn: 8, acc: 160, cd: 3.5e-5, sus: 0, vCap: 0 };
test('flyout: missile accelerates during burn then bleeds speed', () => {
  const f = flyout(AMRAAM, 8000, 250), at8 = f.V[Math.floor(8 / .25) - 1];
  assert.ok(at8 > 250, 'faster after the motor burns'); assert.ok(f.V[f.V.length - 1] < at8, 'slower by the end');
});
test('flyout: distance is strictly increasing', () => {
  const f = flyout(AMRAAM, 5000, 300); for (let i = 1; i < f.S.length; i++) assert.ok(f.S[i] > f.S[i - 1]);
});
test('flyout: range is longer at altitude (thin air)', () => {
  const hi = flyout(AMRAAM, 10000, 250), lo = flyout(AMRAAM, 500, 250);
  assert.ok(hi.S[hi.S.length - 1] > lo.S[lo.S.length - 1]);
});
test('flyout: stops once spent and slow', () => {
  const f = flyout({ life: 200, burn: 2, acc: 50, cd: 1e-3, sus: 0, vCap: 0 }, 0, 200); assert.ok(f.S.length < 200 / .25);
});

const { gunTof, gunDrag } = require('../js/physics.js');
test('gun: PGU-28 reaches 1 km in about 1.4 s at sea level', () => near(gunTof(1000, 1030, 1), 1.41, .08));
test('gun: time of flight is longer than the no-drag value and shorter in thin air', () => {
  assert.ok(gunTof(1000, 1030, 1) > 1000 / 1030); assert.ok(gunTof(1000, 1030, .3) < gunTof(1000, 1030, 1));
});
test('gun: drag slows a round and never reverses it', () => {
  assert.ok(gunDrag(1000, 1, .01) < 1); assert.ok(gunDrag(1000, 1, .01) > 0); assert.equal(gunDrag(1000, 1, 5), 0);
});
test('gun: integrating gunDrag reproduces gunTof', () => {
  let v = 1030, x = 0, t = 0; while (x < 1000) { v *= gunDrag(v, 1, .001); x += v * .001; t += .001; } near(t, gunTof(1000, 1030, 1), .02);
});
