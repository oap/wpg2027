import re

def convert_html_to_md(input_file, output_file):
    with open(input_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # Split into rows to ensure data stays grouped
    rows = content.split('class="forge-table-row forge-table-body__row"')
    
    # Skip the first split part as it's before the first row
    rows = rows[1:]

    markdown_rows = []
    
    # Header
    markdown_rows.append("| Column Name | Description | API Field Name | Data Type |")
    markdown_rows.append("|---|---|---|---|")

    for row in rows:
        # Regex extraction
        col_name_match = re.search(r'class="schema-column-name-cell".*?<span>(.*?)</span>', row, re.DOTALL)
        api_name_match = re.search(r'class="schema-column-field-name-cell".*?<span>(.*?)</span>', row, re.DOTALL)
        data_type_match = re.search(r'class="schema-column-data-type-cell".*?>\s*<a.*?>(.*?)</a>', row, re.DOTALL)
        
        # Description is deeper nested
        # Look for the innermost div inside the collapsed-text-section
        desc_match = re.search(r'class="collapsed-text-section".*?<div>(.*?)</div>', row, re.DOTALL)

        col_name = col_name_match.group(1).strip() if col_name_match else ""
        api_name = api_name_match.group(1).strip() if api_name_match else ""
        data_type = data_type_match.group(1).strip() if data_type_match else ""
        description = desc_match.group(1).strip() if desc_match else ""

        markdown_rows.append(f"| {col_name} | {description} | {api_name} | {data_type} |")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("\n".join(markdown_rows))
    
    print(f"Converted {len(rows)} rows to {output_file}")

if __name__ == "__main__":
    convert_html_to_md('columns.html', 'columns.md')
