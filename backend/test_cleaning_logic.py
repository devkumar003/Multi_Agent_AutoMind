import pandas as pd
import numpy as np
import re

def clean_file(file_path):
    df = pd.read_csv(file_path)
    old_cols = list(df.columns)
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    
    def parse_numeric_text(val):
        if pd.isnull(val): return val
        val_str = str(val).lower().strip()
        if val_str in ['nan', 'none', 'null', 'na', 'n/a', '']:
            return np.nan
            
        if re.match(r'^-?\d+(\.\d+)?[km]$', val_str):
            num = float(re.findall(r'-?\d+(?:\.\d+)?', val_str)[0])
            if 'k' in val_str: return num * 1000
            if 'm' in val_str: return num * 1000000
            
        words = {
            "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
            "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
            "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14,
            "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
            "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
            "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90
        }
        multipliers = {"hundred": 100, "thousand": 1000, "million": 1000000}
        
        if val_str in words: return words[val_str]
        if val_str in multipliers: return multipliers[val_str]
        
        parts = val_str.split()
        if len(parts) > 1 and all(p in words or p in multipliers for p in parts):
            total = 0
            current = 0
            for p in parts:
                if p in words:
                    current += words[p]
                elif p in multipliers:
                    if current == 0: current = 1
                    current *= multipliers[p]
                    if p in ["thousand", "million"]:
                        total += current
                        current = 0
            return total + current
            
        return val

    for col in df.columns:
        if not pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].apply(parse_numeric_text)
            try:
                df_temp = pd.to_numeric(df[col], errors='coerce')
                non_null_count = df[col].notna().sum()
                converted_count = df_temp.notna().sum()
                print(f"Col: {col}, non_null: {non_null_count}, converted: {converted_count}")
                if non_null_count > 0 and converted_count / non_null_count >= 0.5:
                    df[col] = df_temp
                    print(f"Converted {col} to numeric")
                    continue
            except Exception as e:
                print(f"Error converting {col}: {e}")
                pass
                
    print("Salary sample after parse:")
    print(df['salary'].head(10))

clean_file("uploads/19a60092-026b-4d3d-86b2-bd053363b5f0.csv")
