HotKeySet("{PAUSE}", "AddWayPoint");

Func AddWayPoint()
  Run("node waypoint-maker.js", "C:\Users\Dampe-Windoge\Documents\git\wow-client\tools\waypoint-maker",  @SW_HIDE)
  SoundPlay(@WindowsDir & "\media\ding.wav", 1)
EndFunc

While 1
	Sleep(10)
WEnd