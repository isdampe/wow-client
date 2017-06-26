class wowZone {

  constructor() {
    this.battleGroundZones = {
      3277: 'Warsong Gulch',
      3358: 'Arathi Basin'
    };
  }

  isBattleGround( zoneID ) {
    if ( this.battleGroundZones.hasOwnProperty(zoneID) ) {
      return this.battleGroundZones[zoneID];
    } else {
      return false;
    }
  }

}
module.exports = wowZone;
