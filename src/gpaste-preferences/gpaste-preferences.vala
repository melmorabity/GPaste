namespace GPaste {

    public class PreferencesWindow : Gtk.Window {
        private Gtk.CheckButton primary_to_history_button;
        private Gtk.SpinButton max_history_size_button;

        public bool primary_to_history {
            get {
                return primary_to_history_button.get_active();
            }
            set {
                primary_to_history_button.set_active(value);
            }
        }

        public int max_history_size {
            get {
                return max_history_size_button.get_value_as_int();
            }
            set {
                max_history_size_button.get_adjustment().value = value;
            }
        }

        public PreferencesWindow(Gtk.Application app) {
            Object(type: Gtk.WindowType.TOPLEVEL);
            title = _("GPaste Preferences");
            application = app;
            set_default_size(300, 70);
            set_position(Gtk.WindowPosition.CENTER);
            set_resizable(false);
            fill();
        }

        private void fill() {
            primary_to_history_button = new Gtk.CheckButton.with_mnemonic(_("_Primary selection affects history"));
            primary_to_history = (application as Preferences).primary_to_history;
            primary_to_history_button.toggled.connect(()=>{
                (application as Preferences).primary_to_history = primary_to_history;
            });
            max_history_size_button = new Gtk.SpinButton.with_range(5, 100, 5);
            max_history_size = (application as Preferences).max_history_size;
            max_history_size_button.get_adjustment().value_changed.connect(()=>{
                (application as Preferences).max_history_size = max_history_size;
            });
            var history_size_label = new Gtk.Label(_("Max history size: "));
            var hbox = new Gtk.HBox(false, 10);
            hbox.add(history_size_label);
            hbox.add(max_history_size_button);
            var vbox = new Gtk.VBox(false, 10);
            vbox.add(primary_to_history_button);
            vbox.add(hbox);
            add(vbox);
        }
    }

    public class Preferences : Gtk.Application {
        private Settings settings;
        private PreferencesWindow window;

        public int max_history_size {
            get {
                return settings.get_int("max-history-size");
            }
            set {
                settings.set_int("max-history-size", value);
            }
        }

        public bool primary_to_history {
            get {
                return settings.get_boolean("primary-to-history");
            }
            set {
                settings.set_boolean("primary-to-history", value);
            }
        }

        public Preferences() {
            Object(application_id: "org.gnome.GPaste.Preferences");
            settings = new Settings("org.gnome.GPaste");
            activate.connect(init);
            settings.changed.connect((key)=>{
                switch(key) {
                case "max-history-size":
                    window.max_history_size = max_history_size;
                    break;
                case "primary-to-history":
                    window.primary_to_history = primary_to_history;
                    break;
                }
            });
        }

        private void init() {
            window = new PreferencesWindow(this);
            window.show_all();
        }

        public static int main(string[] args) {
            Intl.bindtextdomain(Config.GETTEXT_PACKAGE, Config.LOCALEDIR);
            Intl.textdomain(Config.GETTEXT_PACKAGE);
            Gtk.init(ref args);
            var app = new Preferences();
            try {
                app.register();
            } catch (Error e) {
                stderr.printf(_("Fail to register the gtk application.\n"));
                return 1;
            }
            return app.run();
        }
    }

}
