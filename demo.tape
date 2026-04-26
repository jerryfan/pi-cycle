# pi-cycle demo (VHS)
#
# Goal: show the /cycle menu + cycling in a deterministic way.
# Tip: run this in a normal terminal session; some headless/CI environments may hang.

Output demo.gif

Require pi

Set Shell "bash"
Set FontSize 22
Set Width 1200
Set Height 650
Set TypingSpeed 55ms

# Use an isolated Pi agent dir so the demo doesn't touch your real ~/.pi
Type "cd /c/code/pi/public/pi-cycle" Enter
Type "export PI_CODING_AGENT_DIR=/c/trash/pi-cycle/2026-04-26-vhs-demo-r1/agent" Enter
Type "rm -rf $PI_CODING_AGENT_DIR && mkdir -p $PI_CODING_AGENT_DIR" Enter
Sleep 400ms

Type "pi --version" Enter
Sleep 700ms

Type "pi install -l ." Enter
Sleep 1200ms

# Start Pi offline (no startup network ops needed for the UI demo)
Type "pi --offline" Enter
Sleep 2s

Type "/reload" Enter
Sleep 1200ms

Type "/cycle" Enter
Sleep 2s

Escape
Sleep 600ms

Type "/cycle next" Enter
Sleep 1500ms

Type "/cycle doctor" Enter
Sleep 2s

# Exit Pi
Ctrl+C
Sleep 600ms
