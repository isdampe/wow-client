#NoTrayIcon
#Region ;**** Directives created by AutoIt3Wrapper_GUI ****
#AutoIt3Wrapper_Outfile_x64=..\bin\Win32.exe
#AutoIt3Wrapper_Compression=4
#AutoIt3Wrapper_UseUpx=y
#EndRegion ;**** Directives created by AutoIt3Wrapper_GUI ****

if $cmdline[0] < 1 then
exit
endif

switch $cmdline[1]
  case "winactivate"
    WinActivate("World of Warcraft");
endswitch
