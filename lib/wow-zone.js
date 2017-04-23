class wowZone {

  constructor() {
    this.battleGroundZones = {
      3277: 'Warsong gulch'
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
