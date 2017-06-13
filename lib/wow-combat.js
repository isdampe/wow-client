const wowControl = require('./wow-control.js');
const robot = require('robotjs');

const WC_STATUS_DETECT = 0;
const WC_STATUS_RUN_TO_TARGET = 5;
const WC_STATUS_FACE_TARGET = 7;
const WC_STATUS_FIGHT = 10;
const WC_STATUS_CASTING = 15;
const WC_STATUS_END = 50;

const WC_DISTANCE_CANCEL = 50;
const WC_ROTATION_ACCURACY = 0.75;

const WC_SPELL_ICEBARRIER = '8';
const WC_SPELL_FROSTBOLT = '9';
const WC_SPELL_ICELANCE = '0';
const WC_SPELL_FLURRY = '-';
const WC_SPELL_EBONBOLT = '=';

class wowCombat {

	constructor( getMemory, onEnd ) {
		this.getMemory = getMemory;
		this.onEnd = onEnd;
		this.controller = new wowControl( this.getMemory );
		this.currentFightSequence = 0;
		this.maxFightSequence = 5;
		
		var _this = this;
		this.checkTimer = setInterval(() => {
			_this.checkForCombatEnd();
		}, 250);

		this.status = WC_STATUS_DETECT;
		this.main();

	}

	/**
	 * Detect if combat is done
	 */
	checkForCombatEnd() {

		var p = this.getMemory();
		if ( parseInt(p.playerTarget) === 0 ) {
			console.log('Target dropped. Cancel combat.');
			this.endCombat();
			return;
		}

		

		var d = this.controller.calculateDistance( p.playerY, p.playerX, p.targetY, p.targetX );

		if ( d >= WC_DISTANCE_CANCEL ) {
			console.log('Distance: ' + d);
			console.log('Target too far away. Cancel combat.');
			this.endCombat();
			return;
		}

		if ( parseInt(p.targetHealth) === 0 ) {
			console.log('Target dead. Cancel combat');
			this.endCombat();
			return;
		}
	}

	endCombat() {
		console.log('endCombat');
		this.controller.cancelAll();
		if ( typeof this.onEnd == 'function' ) {
			this.onEnd();	
		}

		clearInterval(this.checkTimer);
		this.status = WC_STATUS_END;
		
	}

	main() {

		if ( this.status === WC_STATUS_END ) return;

		var _this = this;

		switch ( this.status ) {
			case WC_STATUS_DETECT:
				this.dispatchAction();
			break;
			case WC_STATUS_FIGHT:
				this.fightSequence();
			break;
		}

		
		setTimeout(() => {
			_this.main();
		}, 100);

	}

	dispatchAction() {

		if (! this.targetInRange() ) {
			this.runToTarget(() => {
				this.status = WC_STATUS_DETECT;
			});
			return;
		}
		this.startFight();

	}

	targetInRange() {

		var p = this.getMemory();

		if ( parseInt(p.playerTarget) === 0 ) return;

		//Is the target too far away?
		var d = this.controller.calculateDistance( p.playerY, p.playerX, p.targetY, p.targetX );
		if ( d > 20 && d < WC_DISTANCE_CANCEL ) {
			return false;
		}

		return true;

	}

	startFight() {

		console.log('Starting fight');
		this.status = WC_STATUS_FIGHT;
		this.currentFightSequence = 0;

	}

	runToTarget(callback) {

		console.log('Running to target');
		this.status = WC_STATUS_RUN_TO_TARGET;

		var p = this.getMemory();
		this.controller.walkTo( p.targetX, p.targetY, () => {
			if ( typeof callback === 'function' ) {
				callback();
			}
		}, {
			fuzzyOffset: 12
		} );

	}

	isFacingTarget() {

		var p = this.getMemory();

		//Are we facing the target?
		var bearing = this.controller.calculateBearing( p.playerY, p.playerX, p.targetY, p.targetX );

		var rd = Math.abs(bearing - p.playerRotation);
		if ( rd < WC_ROTATION_ACCURACY ) {
			return true;
		}

		return false;

	}

	faceTarget() {

		if ( this.isFacingTarget() ) return;

		var p = this.getMemory();

		var bearing = this.controller.calculateBearing( p.playerY, p.playerX, p.targetY, p.targetX );

		var currentStatus = this.status;

		console.log('Face target');
		this.status = WC_STATUS_FACE_TARGET;

		var p = this.getMemory();
		this.controller.rotateTo(bearing, () => {
			this.status = currentStatus;
		});
	}

	fightSequence() {

		switch( this.currentFightSequence ) {
			case 0:
				this.castSpell(WC_SPELL_ICEBARRIER, 1200);
			break;
			case 1:
				this.castSpell(WC_SPELL_FROSTBOLT, 1900);
			break;
			case 2:
				this.castSpell(WC_SPELL_ICELANCE, 1500);
			break;
			case 3:
				this.castSpell(WC_SPELL_FLURRY, 3200);
			break;
			case 4:
				this.castSpell(WC_SPELL_EBONBOLT, 3200);
			break;
		}

		this.currentFightSequence++;
		if ( this.currentFightSequence >= this.maxFightSequence ) {
			this.currentFightSequence = 1;
		}

		console.log(this.currentFightSequence);

	}

	castSpell(spell, time, callback) {

		var _this = this;

		if (! this.isFacingTarget() ) {
			this.faceTarget();
		}
		if (! this.targetInRange() ) {
			console.log('Chasing target');
			this.runToTarget(() => {
				_this.status = WC_STATUS_FIGHT;
				_this.castSpell(spell, time, callback);
			});
			return;
		}

		if ( this.status === WC_STATUS_CASTING ) return;

		var status = this.status;

		var _this = this;
		this.status = WC_STATUS_CASTING;

		console.log('castSpell: ' + spell)
		robot.keyTap(spell);
		setTimeout(() => {
			if ( _this.status === WC_STATUS_END ) return;
			console.log('Spell done');
			_this.status = status;
			if ( typeof callback === 'function' ) {
				callback();
			}
		}, time);

	}

}

module.exports = wowCombat;
