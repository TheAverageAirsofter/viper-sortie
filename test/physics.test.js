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
