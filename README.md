# **PySearch**

## A faster way to code

**PySearch** provides intelligent completion suggestions that improve on ordinary Google search, by incorporating the context surrounding each query and learning on the fly.


## Getting Started:

0. (Optional) Add your python runtime to the PySearch config.

  `View -> Toggle Command Palate -> Settings View: View Installed Packages -> PySearch Settings`

![alt text][add_env]

[add_env]: ./docs/images/add_env.png "Add new environment"

1. Create or Open a Python file in a Project Folder:

  `File -> Add Project Folder`

  `[right-click] -> New File`

![alt text][add_new_file]

[add_new_file]: ./docs/images/add_new_file.png "Add new Python file"

2. Follow prompt to download [pyls](https://github.com/palantir/python-language-server)

  Or..

  Run `pip install python-language-server` in the command-line

  `View -> Toggle Command Palate -> Window: Reload`

![alt text][open_file]

[open_file]: ./docs/images/open_file.png "Add new Python file"


3. Install non-standard libraries in your python runtime to begin making PySearch queries

  e.g. `pip install sklearn`


## Using PySearch:

To make a PySearch query, type the delimiter (`!!` *by default*) to begin a search:

![alt text][cosine_distance_c3]

[cosine_distance_c3]: ./docs/images/cosine_distance.png "Cosine distance"


For more control over query results, try adding the `--context` flag (alias `-c`) anywhere in your query
to scale context sensitivity.

The `--context` flag takes integer values from `0` through `5`, where higher numbers increase context sensitivity.

![alt text][cosine_distance_c0]

[cosine_distance_c0]: ./docs/images/cosine_distance_c0.png "Cosine distance"


While PySearch searches only functions across Python 3.7+, broader coverage is currently in alpha. Our search indexes are hosted in PySearch Cloud, and we're actively working on rolling out a local version. All requests are TLS/SSL encrypted, anonymized, and **never** sold or shared.

## Troubleshooting

1. If PySearch queries aren't working, check the logs to confirm the server started successfully:

  `View -> Developer -> Toggle Developer Tools`

  Check the `Console` tab for `PySearch server is starting up`

2. Atom uses events to trigger the server startup process, so try reloading the window

  `View -> Toggle Command Palate -> Window: Reload`

3. If the server startup isn't initiated upon reloading, you may not have opened your Python file in an active workspace (see "Getting Started" step #1)

4. If your PySearch results aren't including non standard library packages, check that the package is installed in your python runtime in "Getting Started" step #3.

5. For feedback or additional support, visit us [here](https://www.getflowbot.com).

## Known Issues


## Release Notes


### 0.2.3

Initial release

___

Made with ❤ by Flowbot Inc
