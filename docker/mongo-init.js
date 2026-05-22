db = db.getSiblingDB("intellmeet");
db.createCollection("users");
db.createCollection("meetings");
db.createCollection("teams");
db.createCollection("tasks");
print("IntellMeet database initialized.");
