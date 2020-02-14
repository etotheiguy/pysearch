# **PySearch**

### A faster way to code

**PySearch** provides intelligent completion suggestions that improve on ordinary Google search, by incorporating the context surrounding each query and learning on the fly.

Because we're in beta, the service is free for a limited number of users.


### Getting Started:

1. Download [pyls](https://github.com/palantir/python-language-server):
  ```
   pip install python-language-server
  ```

2. Add your python runtime to the PySearch config.

  Mac:   `Cmd-Shift-P -> Settings View: View Installed Packages -> PySearch Settings`

  Linux: `Ctrl-Shift-P -> Settings View: View Installed Packages -> PySearch Settings`


### Using PySearch:
To make a PySearch query, type the delimiter (`!!` *by default, but user-configurable*) to begin a search:

![alt text][cosine_distance_c3]

[cosine_distance_c3]: ./docs/images/cosine_distance.png "Cosine distance"


For more control over query results, try adding the `--context` flag (alias `-c`) anywhere in your query
to scale context sensitivity.

The `--context` flag takes integer values from `0` through `5`, where higher numbers increase context sensitivity.

![alt text][cosine_distance_c0]

[cosine_distance_c0]: ./docs/images/cosine_distance_c0.png "Cosine distance"


While PySearch searches only functions across Python 3.7+, broader coverage is currently in alpha. Our search indexes are hosted in PySearch Cloud, and we're actively working on rolling out a local version. All requests are TLS/SSL encrypted, anonymized, and **never** sold or shared.
___

Made with ❤ by Flowbot Inc
