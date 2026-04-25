# pi-cycle demo (recorded with VHS)
#
# This demo is intentionally non-interactive so it can be rebuilt without requiring API keys.

Output demo.gif

Require pi

Set Shell "bash"
Set FontSize 22
Set Width 1200
Set Height 650
Set TypingSpeed 55ms

Type "cd /c/code/pi/public/pi-cycle" Enter
Type "export PI_CODING_AGENT_DIR=/c/trash/pi-cycle/2026-04-25-vhs-demo-r1/agent" Enter
Type "rm -rf $PI_CODING_AGENT_DIR && mkdir -p $PI_CODING_AGENT_DIR" Enter
Sleep 400ms

Type "pi --version" Enter
Sleep 700ms

Type "pi install -l ." Enter
Sleep 1200ms

Type "pi list" Enter
Sleep 900ms

Type "echo" Enter
Type "echo 'In Pi:'" Enter
Type "echo '  /reload'" Enter
Type "echo '  /cycle'" Enter
Type "echo '  F8 (cycle next)'" Enter
Sleep 800ms

Type "echo" Enter
Type "echo 'Config example:'" Enter
Type "sed -n '1,40p' example.json" Enter
Sleep 1s
