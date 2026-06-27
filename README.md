# EY Thailand Blood on the Clocktower Community Repository

This repository is a multi-purpose workspace for managing the Blood on the Clocktower (BotC) community within EY Thailand.

It supports weekly registration, participant statistics, game-result tracking, and player-level insights inspired by the player perspective available on botc.games.

---

## Repository Objectives

This repository is designed to support four main purposes:

1. Friday Evening Registration Poll
   Public registration for participants who want to join each Friday evening BotC session.

2. Participant Statistics Dashboard
   Display interesting statistics for each participant, such as win rate, number of games played, favorite character type, and team distribution.

3. Game Result Database
   Maintain the underlying database required to calculate participant statistics.

4. Player-Level Insight Page
   Provide selectable insight for each participant name, similar to the player perspective in botc.games.

---

## Key Concept

The primary key for participant-level tracking is:

```text
Name
```

Each participant should have one consistent name across registration, game-result records, and dashboard reporting.

---

## Repository Structure

The workspace is organized around a lightweight web application and supporting data files:

- app.js — application logic for the poll and related workflows
- server.js — server entry point for serving the app locally
- index.html — main page for registration and community-facing views
- styles.css — styling for the user interface
- script/pdfs.json — data source used by supporting scripts
- generate-pdfs-list.js — utility script for generating or maintaining supporting lists/data
