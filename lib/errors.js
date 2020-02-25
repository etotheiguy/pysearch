showErrorMessage(error_code) {
      switch (code) {
        case 0: {
          return;
        }
        case 2: {
          atom.notifications.addError("Unable to start a python language server.\n\
                  Install by running\n\n```pip install python-language-server[all]```",
            { dismissable: true });
          return;
        }
        case 7: {
          atom.notifications.addError(
            "Pyls is not installed",
            {
              dismissable: true,
              buttons: [
                {
                  text: "Install Instructions",
                  onDidClick: () =>
                  atom.workspace.open("atom://config/packages/pysearch")
                },
                {
                  text: "Restart",
                  onDidClick: () =>
                  atom.restartApplication()
                },
              ],
              description:
              "Install `pyls` by running:\n" +
              "```\n" +
              `${python} -m pip install 'python-language-server[all]'\n` +
              "```\n" +
              "<br>Restart Atom after installation is complete."
            }
          );
        }

          atom.notifications.addError(
            err,
            {
              dismissable: true,
              buttons: [
                {
                  text: "Configure python runtime",
                  onDidClick: () =>
                  atom.workspace.open("atom://config/packages/pysearch")
                },
              ],
            }
          )
}
