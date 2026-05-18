
import sys

file_path = r'd:\Kashif\Apps\New\codeslogic-New-main\codeslogic-New-main\sections\Projects.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the mangled parentheses pattern
# We match a broad enough pattern to be sure
pattern = ')     )\n                                                          )\n                                      }'
# Since the number of spaces might vary, let's use a regex or just replace what we saw in the terminal
# Terminal output:
# >                                                     )     )
#                                                           )
#                                       }

import re
# Match ) followed by spaces and ) then newline then spaces and ) then newline then spaces and }
new_content = re.sub(r'\)\s+\)\s+\)\s+\}', ') ) }', content)

# Wait, that might be too broad. Let's look at the context.
# We know it's right before onClick

target = re.search(r'disabled=\{[\s\S]*?onClick=\{', content)
if target:
    block = target.group(0)
    # Count opening and closing parentheses in the block
    opens = block.count('(')
    closes = block.count(')')
    
    # We want to keep just enough closes to match opens
    # But it's complex because of the ? : structure.
    
    # Let's just fix the specific mangled part
    fixed_block = re.sub(r'\)\s+\)\s+\)\s+\}', '))', block) # No, that's wrong.
    
    # Let's just replace the exact lines if possible
    # I'll just use a simpler replacement based on the unique mangled string
    
    # Actually, I'll just find the "onClick" and go backwards.
    
    lines = content.splitlines()
    for i in range(len(lines)):
        if 'onClick={() => {' in lines[i] and i > 2:
            if ')' in lines[i-1] and ')' in lines[i-2]:
                lines[i-1] = ' ' * 48 + ')'
                lines[i-2] = ' ' * 44 + ')'
                # Remove extra line if it exists
                if ')' in lines[i-3] and 'false' not in lines[i-3]:
                    # Keep it as is or clean up
                    pass
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))
    print("Fixed.")
else:
    print("Could not find block.")
