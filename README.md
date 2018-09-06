# Stars4all project dashboard

A web interface for viewing and visualising contribution and social media activity for stars4all projects.

Objectives:
* Compare project engagement over time.
* Compare individual projects

Measuring engagement:
* Number of users
* Rate of change of users (new users, attrition)
* Number of contributions
* Number of contributions per user

## Installation

The `./build` directory should be hosted through a HTTP server (e.g. apache, nginx).

## Development and Building

The dashboard source files are located in the `./src` directory. If you modify these files, you will need to rebuild the dashboard:

1. install nodejs and npm
2. run `npm install` from the project root directory (only need to to this once)
3. run `npm run build`

## Project data

Data about each project should be placed in the `./data` directory. There are two kinds of data: contribution data and social media data.

### Contribution data

Contribution data are exported from individual projects, such as Dark Skies, Globe at Night etc, and include the number of contributes over time, the number of users who are contributing, and task metrics.

Each project makes their data available in different formats, so the way that the data are parsed is unique to each project. The parsers can be found in the `./parsers` directory.

A parser includes the following:
* `name` (string): the title of the project
* `url` (string, optional): URL to the project
* `parent` (string, optional): ID (filename of parser excluding extension) of a project which this project is a part of.
* `files` (string[]): an array of paths to data in CSV format
* `filter` (boolean, optional): a function which returns true if the row should be parsed. A row object is provided as an argument.
* `parseRow` (function): a function to process each row. A row object is provided as an argument, and an object with the following properties should be returned
    * `date` (Date): when the contribution was made
    * `isContribution` (boolean): is the row a valid contribution
    * `user` (string/number): the user ID associated with the contribution
    * `country` (string, optional): the country of the user who made the contribution
* `note` (string): any additional notes

When creating a parser, or updating the data for a project, perform the following to update the dashboard:

1. run `node process-project <id>` (where ID is the parser filename without the extension)
2. run `npm run build` (this step is only necessary when adding or removing a project)

### Social media data

Social media data are data scraped via NodeXL from Facebook and Twitter. These data should be placed in `./data/socialmedia/`.

To update the dashboard after adding/updating social media data:

1. run `node process-socialmedia <id>` (where ID is the data filename without the extension)
2. run `node build` (this step is only necessary when adding or removing social media data)

## Technical information

To keep things simple and secure, the dashboard is served as static HTML with no server component.  This means that it must be rebuilt to update it.

This process could be automated using cron jobs. For example, a daily cron could be set up to download snapshoted data from a project and then rebuild the relevant files in the dashboard.

```sh
wget -O data/someproject.csv http://someproject.org/data.csv 
node process-project someproject
```
