from fastapi import APIRouter, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db, User, ActivityHistory
from auth import get_current_user
from llm import get_qwen
import os
import uuid
import pandas as pd
import numpy as np
import io
import re
import tempfile
import subprocess

router = APIRouter(prefix="/api/data", tags=["data"])

class DataCleanReq(BaseModel):
    file_id: str

class DataQueryReq(BaseModel):
    file_id: str
    query: str

@router.post("/upload")
async def upload_data(file: UploadFile = File(...), current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    contents = await file.read()
    
    file_id = str(uuid.uuid4())
    save_path = os.path.join("uploads", f"{file_id}.csv")
        
    try:
        if file.filename.endswith(".xlsx") or file.filename.endswith(".xls"):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
            
        # Standardize the saved format as CSV for the rest of the pipeline
        df.to_csv(save_path, index=False)
    except Exception as e:
        return {"error": f"Failed to parse file: {str(e)}. If Excel fails, run 'pip install openpyxl xlrd'."}

    db.add(ActivityHistory(user_id=current_user.id, title="Analyzed Dataset", activity_type="data", subtitle=file.filename))
    db.commit()

    total_rows = len(df)
    total_cols = len(df.columns)
    null_entropy = round((df.isnull().sum().sum() / (total_rows * total_cols)) * 100, 2)
    
    metrics = []
    for col in df.select_dtypes(include=['float64', 'int64']).columns:
        metrics.append({
            "colName": str(col),
            "avg": round(float(df[col].mean()), 2),
            "min": round(float(df[col].min()), 2),
            "max": round(float(df[col].max()), 2)
        })

    preview = df.head(100).fillna("").to_dict(orient="records")

    return {
        "file_id": file_id,
        "columns": list(df.columns),
        "data": preview,
        "integrity": {
            "total_rows": total_rows,
            "total_cols": total_cols,
            "null_entropy": null_entropy,
            "metrics": metrics[:4]
        }
    }

@router.get("/export/{file_id}")
async def export_data(file_id: str):
    file_path = os.path.join("uploads", f"{file_id}.csv")
    if not os.path.exists(file_path):
        return {"error": "Dataset missing on server."}
    return FileResponse(path=file_path, filename="autothink_dataset.csv", media_type="text/csv")

@router.post("/clean")
async def clean_data(req: DataCleanReq, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    file_path = os.path.join("uploads", f"{req.file_id}.csv")
    if not os.path.exists(file_path):
        return {"error": "Dataset missing on server."}
        
    try:
        df = pd.read_csv(file_path)
        summary = []
        
        old_cols = list(df.columns)
        df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
        if old_cols != list(df.columns):
            summary.append("- **Consistency**: Converted all column names to lowercase snake_case.")
            
        threshold = len(df) * 0.4
        dropped_cols = []
        for col in df.columns:
            if df[col].isnull().sum() > threshold:
                dropped_cols.append(col)
        if dropped_cols:
            df.drop(columns=dropped_cols, inplace=True)
            summary.append(f"- **Missing Data**: Dropped columns with >40% missing values: {', '.join(dropped_cols)}")

        dupes = df.duplicated().sum()
        if dupes > 0:
            df.drop_duplicates(inplace=True)
            summary.append(f"- **Duplicates**: Removed {dupes} duplicate row(s).")
            
        def parse_numeric_text(val):
            if pd.isnull(val): return val
            val_str = str(val).lower().strip()
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
            if df[col].dtype == 'object':
                df[col] = df[col].apply(parse_numeric_text)
                try:
                    df_temp = pd.to_numeric(df[col])
                    df[col] = df_temp
                    summary.append(f"- **Formatting**: Parsed numeric strings in column '{col}'.")
                    continue
                except:
                    pass
                
                if 'date' in col.lower() or 'time' in col.lower():
                    try:
                        df[col] = pd.to_datetime(df[col], errors='coerce').dt.strftime('%Y-%m-%d')
                        summary.append(f"- **Formatting**: Standardized '{col}' to YYYY-MM-DD date format.")
                        continue
                    except:
                        pass
                
                df[col] = df[col].astype(str).str.strip().str.title()
                df[col] = df[col].replace({'Nan': np.nan, 'None': np.nan, '': np.nan})
                
                if 'gender' in col.lower() or 'sex' in col.lower():
                    df[col] = df[col].replace({'M': 'Male', 'F': 'Female'})
                
        summary.append("- **Formatting**: Trimmed spaces, normalized text casing, and unified string mappings.")

        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                miss_cnt = df[col].isnull().sum()
                if miss_cnt > 0:
                    med = df[col].median()
                    df[col] = df[col].fillna(med)
                    summary.append(f"- **Missing Data**: Filled {miss_cnt} missing values in '{col}' with median ({med}).")
                
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                outliers = ((df[col] < lower_bound) | (df[col] > upper_bound)).sum()
                if outliers > 0:
                    df[col] = np.clip(df[col], lower_bound, upper_bound)
                    summary.append(f"- **Validation**: Clipped {outliers} extreme outliers in '{col}' using IQR boundaries.")
                    
                if 'age' in col.lower():
                    neg_ages = (df[col] < 0).sum()
                    if neg_ages > 0:
                        df.loc[df[col] < 0, col] = np.nan
                        med = df[col].median()
                        df[col] = df[col].fillna(med)
                        summary.append(f"- **Validation**: Fixed {neg_ages} impossible negative values in '{col}'.")
                        
            else:
                miss_cnt = df[col].isnull().sum()
                if miss_cnt > 0:
                    mode_vals = df[col].mode()
                    if not mode_vals.empty:
                        m_val = mode_vals[0]
                        df[col] = df[col].fillna(m_val)
                        summary.append(f"- **Missing Data**: Filled {miss_cnt} missing values in categorical '{col}' with mode ('{m_val}').")

        df.to_csv(file_path, index=False)
        
    except Exception as e:
        import traceback
        return {"error": f"Failed to clean dataset natively: {str(e)}\n{traceback.format_exc()}"}

    db.add(ActivityHistory(user_id=current_user.id, title="Cleaned Dataset", activity_type="data", subtitle="Automated Native Python Pipeline"))
    db.commit()

    total_rows = len(df)
    total_cols = len(df.columns)
    null_entropy = round((df.isnull().sum().sum() / (total_rows * total_cols)) * 100, 2) if total_rows > 0 else 0
    
    num_cols = df.select_dtypes(include=['float64', 'int64']).columns
    metrics = []
    for col in num_cols:
        metrics.append({
            "colName": str(col),
            "avg": round(float(df[col].mean()), 2),
            "min": round(float(df[col].min()), 2),
            "max": round(float(df[col].max()), 2)
        })

    preview = df.head(100).fillna("").to_dict(orient="records")

    return {
        "file_id": req.file_id,
        "columns": list(df.columns),
        "data": preview,
        "summary": "\n".join(summary) if summary else "No cleaning modifications were necessary.",
        "integrity": {
            "total_rows": total_rows,
            "total_cols": total_cols,
            "null_entropy": null_entropy,
            "metrics": metrics[:4]
        }
    }


@router.post("/query")
async def query_data(req: DataQueryReq, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        file_path = os.path.join("uploads", f"{req.file_id}.csv")
        file_path_unix = file_path.replace("\\", "/")
        if not os.path.exists(file_path):
            return {"error": "Dataset missing on server."}
            
        try:
            df_preview = pd.read_csv(file_path, nrows=5)
            columns = list(df_preview.columns)
        except:
            return {"error": "Failed to parse CSV headers."}

        prompt = f"Write pure Python Pandas code to execute the following request on a CSV file named '{file_path_unix}'. \n\nThe CSV has the following columns: {columns}\n\nRequest: {req.query}\n\nLoad the CSV natively, do the operation, and print the specific final output requested natively to stdout. CRITICAL: If you generate any plots (matplotlib/seaborn), you MUST save them to 'plot_output.png' using plt.savefig('plot_output.png') and NEVER use plt.show(). Return exactly only the python code block."
        
        qwen = get_qwen()
        res = await qwen.ainvoke(prompt)
        clean_code = res.content.replace("```python", "").replace("```", "").strip()
        
        with tempfile.NamedTemporaryFile("w+", suffix=".py", delete=False, encoding="utf-8") as f:
            f.write("import pandas as pd\nimport numpy as np\nimport scipy.stats as stats\nimport math\n\n")
            f.write(clean_code)
            temp_path = f.name
            
        try:
            execution = subprocess.run(["python", temp_path], capture_output=True, text=True, timeout=30)
            output = execution.stdout if execution.returncode == 0 else f"Error:\n{execution.stderr}"
        except Exception as e:
            output = f"Execution engine error: {str(e)}"
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)
                
        image_data = None
        if os.path.exists("plot_output.png"):
            import base64
            with open("plot_output.png", "rb") as img_file:
                image_data = base64.b64encode(img_file.read()).decode('utf-8')
            try:
                os.remove("plot_output.png")
            except:
                pass
            
        db.add(ActivityHistory(user_id=current_user.id, title="Queried Dataset via Qwen", activity_type="data", subtitle=req.query[:20]+"..."))
        db.commit()

        return {"output": output, "code_used": clean_code, "image_base64": image_data}
    except Exception as e:
        import traceback
        return {"error": f"Critical Backend Failure: {str(e)}"}


@router.post("/visualize")
async def visualize_data(req: DataQueryReq, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        file_path = os.path.join("uploads", f"{req.file_id}.csv")
        if not os.path.exists(file_path):
            return {"error": "Dataset missing on server."}
            
        try:
            df = pd.read_csv(file_path)
            columns = list(df.columns)
            sample_data = df.head(3).to_dict(orient="records")
        except:
            return {"error": "Failed to parse CSV."}

        prompt = f"""You are an advanced data intelligence and visualization engine inside a universal data analytics platform.

Your job is to analyze ANY structured tabular dataset and automatically generate the most meaningful visual insights without prior knowledge of the domain.

---

## INPUT

Dataset Schema:
{columns}

Sample Data (optional but highly recommended):
{sample_data}

User Intent (optional):
{req.query}

---

## OUTPUT FORMAT (STRICT JSON ONLY)

Return ONLY a JSON array sorted by importance (highest priority first):

[
  {{
    "chart_type": "bar | line | pie | scatter",
    "title": "Clear human-readable insight title",
    "x": "column_name",
    "y": "column_name",
    "aggregation": "sum | avg | count | min | max | none",
    "group_by": "column_name | null",
    "insight": "One clear sentence explaining the finding",
    "priority": 1
  }}
]

## FINAL RULE

Return ONLY valid JSON array. No text. No markdown. No comments.
"""
        qwen = get_qwen()
        res = await qwen.ainvoke(prompt)
        import json
        import re
        
        json_str = res.content
        match = re.search(r'\[.*\]', json_str, re.DOTALL)
        if match:
            json_str = match.group(0)
            
        try:
            specs = json.loads(json_str)
            if isinstance(specs, dict):
                specs = [specs]
        except:
            return {"error": "LLM failed to return a valid JSON array specification."}
            
        results = []
        for spec in specs:
            x_col = spec.get("x")
            y_col = spec.get("y")
            agg = spec.get("aggregation", "none")
            group_by = spec.get("group_by")
            
            try:
                if not x_col or x_col not in df.columns:
                    raise ValueError(f"Missing or invalid x_col: {x_col}")

                if agg == "count":
                    if not group_by or str(group_by).lower() == "null":
                        group_by = x_col
                    
                    chart_df = df.groupby(group_by).size().reset_index(name="count")
                    spec["y"] = "count"
                    spec["x"] = group_by
                
                elif agg != "none":
                    if not group_by or str(group_by).lower() == "null":
                        group_by = x_col
                        
                    if not y_col or y_col not in df.columns or not pd.api.types.is_numeric_dtype(df[y_col]):
                        chart_df = df.groupby(group_by).size().reset_index(name="count")
                        spec["y"] = "count"
                        spec["x"] = group_by
                        spec["aggregation"] = "count"
                    else:
                        if agg == "sum": chart_df = df.groupby(group_by)[y_col].sum().reset_index()
                        elif agg == "avg": chart_df = df.groupby(group_by)[y_col].mean().reset_index()
                        elif agg == "min": chart_df = df.groupby(group_by)[y_col].min().reset_index()
                        elif agg == "max": chart_df = df.groupby(group_by)[y_col].max().reset_index()
                        else: chart_df = df.groupby(group_by)[y_col].mean().reset_index()
                
                else:
                    if not y_col or y_col not in df.columns:
                        chart_df = df[x_col].value_counts().reset_index()
                        chart_df.columns = [x_col, "count"]
                        spec["y"] = "count"
                    else:
                        chart_df = df[[x_col, y_col]]
                    
                if len(chart_df) > 1000:
                    chart_df = chart_df.head(1000)
                    
                chart_data = chart_df.fillna(0).to_dict(orient="records")
                results.append({"spec": spec, "data": chart_data})
            except Exception as e:
                continue
                
        db.add(ActivityHistory(user_id=current_user.id, title="Auto-Insights Dashboard Generated", activity_type="data", subtitle=f"Generated {len(results)} charts."))
        db.commit()

        return {"charts": results}
    except Exception as e:
        import traceback
        return {"error": f"Critical Backend Failure: {str(e)}"}
