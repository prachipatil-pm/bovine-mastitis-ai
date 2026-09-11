
import streamlit as st
import pandas as pd
import joblib
import plotly.express as px

st.set_page_config(
    page_title="Bovine Mastitis AI",
    page_icon="🐄",
    layout="wide"
)

# Load data and EC-only AI model
df = pd.read_csv("mastitis_20_cows.csv")
model = joblib.load("mastitis_model.pkl")

st.title("🐄 Bovine Mastitis AI")
st.subheader("AI-Based Early-Risk Monitoring System")

st.info(
    "This prototype uses a simulated EC sensor reading and synthetic "
    "demonstration data. It provides an early-risk indication, not a diagnosis."
)

# -----------------------------
# COW SELECTION
# -----------------------------

st.header("🐄 Select Cow")

selected_cow = st.selectbox(
    "Choose Cow ID",
    df["Cow_ID"].tolist()
)

cow = df[df["Cow_ID"] == selected_cow].iloc[0]

st.success(f"Currently monitoring: {selected_cow}")

# -----------------------------
# FARM OVERVIEW
# -----------------------------

st.header("📊 Farm Overview")

total = len(df)
low = len(df[df["Risk_Label"] == "Low"])
medium = len(df[df["Risk_Label"] == "Medium"])
high = len(df[df["Risk_Label"] == "High"])

a, b, c, d = st.columns(4)

a.metric("🐄 Total Cows", total)
b.metric("🟢 Low Risk", low)
c.metric("🟠 Medium Risk", medium)
d.metric("🔴 High Risk", high)

st.divider()

# -----------------------------
# SELECTED COW INFORMATION
# -----------------------------

st.header("🔍 Selected Cow Information")

a, b, c = st.columns(3)

a.metric("Cow ID", cow["Cow_ID"])
b.metric("Breed", cow["Breed_Type"])
c.metric("Recorded EC", f'{cow["Milk_EC_mS_cm"]} mS/cm')

# -----------------------------
# EC SENSOR
# -----------------------------

st.header("📡 EC Sensor Monitoring")

st.success("🟢 EC Sensor: ACTIVE (DEMO)")

sensor_ec = st.slider(
    "EC Sensor Reading (mS/cm)",
    min_value=3.0,
    max_value=10.0,
    value=float(cow["Milk_EC_mS_cm"]),
    step=0.1
)

st.metric(
    "Current EC Sensor Reading",
    f"{sensor_ec:.1f} mS/cm"
)

st.caption(
    "The slider simulates the EC value that will later come "
    "from the EC sensor connected to ESP32."
)

# -----------------------------
# AI PREDICTION
# -----------------------------

input_data = pd.DataFrame({
    "Milk_EC_mS_cm": [sensor_ec]
})

prediction = model.predict(input_data)[0]

probabilities = model.predict_proba(input_data)[0]
classes = model.classes_

score = probabilities[
    list(classes).index(prediction)
] * 100

# -----------------------------
# AI RESULT
# -----------------------------

st.header("🤖 AI Early-Risk Assessment")

if prediction == "Low":

    st.success(
        "🟢 LOW RISK\n\n"
        "Continue routine monitoring."
    )

elif prediction == "Medium":

    st.warning(
        "🟠 MEDIUM RISK\n\n"
        "Monitor the cow closely and consider veterinary examination."
    )

else:

    st.error(
        "🔴 HIGH RISK\n\n"
        "Veterinary examination recommended."
    )

a, b = st.columns(2)

a.metric("Predicted Risk", prediction)

b.metric(
    "Prototype Model Score",
    f"{score:.1f}%"
)

st.caption(
    "The model score is a prototype output and is NOT a clinically "
    "validated probability."
)

# -----------------------------
# EC GRAPH
# -----------------------------

st.divider()

st.header("📈 Milk EC Across Cows")

fig1 = px.bar(
    df,
    x="Cow_ID",
    y="Milk_EC_mS_cm",
    color="Risk_Label",
    title="Milk Electrical Conductivity"
)

fig1.add_hline(
    y=sensor_ec,
    line_dash="dash",
    annotation_text="Current Sensor Reading"
)

st.plotly_chart(
    fig1,
    use_container_width=True
)

# -----------------------------
# HIGH-RISK COWS
# -----------------------------

st.header("🚨 High-Risk Cows")

high_cows = df[df["Risk_Label"] == "High"]

st.dataframe(
    high_cows[
        [
            "Cow_ID",
            "Breed_Type",
            "Milk_EC_mS_cm",
            "Risk_Label"
        ]
    ],
    use_container_width=True,
    hide_index=True
)

# -----------------------------
# ALL RECORDS
# -----------------------------

st.header("📋 All Cow Records")

st.dataframe(
    df,
    use_container_width=True,
    hide_index=True
)

# -----------------------------
# DOWNLOAD
# -----------------------------

st.download_button(
    "📥 Download Farm Data",
    df.to_csv(index=False),
    "mastitis_farm_records.csv",
    "text/csv"
)

st.divider()

st.caption(
    "SIH 2026 Prototype | Synthetic demonstration dataset | "
    "EC-based early-risk indication | Not a clinical diagnosis"
)
