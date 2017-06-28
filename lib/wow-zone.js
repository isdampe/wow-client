class wowZone {

  constructor() {
    this.battleGroundZones = {
      3277: 'Warsong Gulch',
      3358: 'Arathi Basin',
      2597: 'Alterac Valley',
      5031: 'Twin Peaks',
      5449: 'Battle for Gilneas',
      6126: 'Silvershard Mines',
      6665: 'Deepwind Gorge',
      6051: 'Temple of Kotmogu',
      3820: 'Eye of the Storm'
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
